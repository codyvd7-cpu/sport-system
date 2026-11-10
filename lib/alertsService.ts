import { SupabaseClient } from '@supabase/supabase-js';
import { broadcastPush, pushReady } from './push';

// ─── THE alert domain service ───────────────────────────────────────────────────
// Single implementation behind BOTH alert endpoints (/api/alerts and
// /api/safety-alert). Fixes the P0 split-brain: previously the portal-admin
// Safety tab wrote to `safety_alerts` while the banner read `urgent_alerts`,
// so its activations never showed anywhere (and its push sends silently
// failed on a schema mismatch). Everything now runs on `urgent_alerts`
// through the one working push pipeline.

export interface ActiveAlert {
  id: string;
  type: string;
  message: string;
  created_by: string | null;
  created_at: string;
}

export async function getActiveAlert(db: SupabaseClient, schoolId?: string | null): Promise<ActiveAlert | null> {
  let query = db.from('urgent_alerts')
    .select('id,type,message,created_by,created_at')
    .eq('active', true).order('created_at', { ascending: false }).limit(1);
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data } = await query;
  return (data?.[0] as ActiveAlert) || null;
}

const DEFAULT_MESSAGES: Record<string, string> = {
  lightning: 'Lightning detected — all outdoor training and matches are suspended. Move indoors immediately.',
  general: 'Safety alert — check with your coach before continuing.',
};

export async function activateAlert(db: SupabaseClient, opts: {
  message?: string; type?: string; actor: string; schoolId: string | null;
}): Promise<{ alert: ActiveAlert; pushed: number; pushConfigured: boolean }> {
  // A safety alert must target a specific school — never a null/global one
  // (which would broadcast to every school). Blocker 9.
  if (!opts.schoolId) throw new Error('A school is required to raise an alert.');
  const type = opts.type || 'lightning';
  const message = (opts.message || '').trim() || DEFAULT_MESSAGES[type] || DEFAULT_MESSAGES.general;

  // One active alert at a time PER SCHOOL: retire any previous one from the
  // same school first. Checked — if the retire fails we stop, rather than
  // inserting a second active alert on top of the old one.
  const { error: retireErr } = await db.from('urgent_alerts')
    .update({ active: false, cleared_at: new Date().toISOString() })
    .eq('active', true).eq('school_id', opts.schoolId);
  if (retireErr) throw new Error(retireErr.message);

  const { data, error } = await db.from('urgent_alerts')
    .insert([{ type, message, created_by: opts.actor, school_id: opts.schoolId }])
    .select('id,type,message,created_by,created_at').single();
  if (error) throw new Error(error.message);

  const pushed = await broadcastPush(db, {
    // No hard-coded school name — this service is multi-school (AP-12/AP-41).
    title: type === 'lightning' ? '⚡ Lightning Alert' : '⚠️ Safety Alert',
    body: message,
    url: '/portal',
    urgent: true,
    tag: 'altus-safety',
  }, opts.schoolId);
  return { alert: data as ActiveAlert, pushed, pushConfigured: pushReady() };
}

export async function clearAlert(db: SupabaseClient, schoolId: string | null): Promise<{ pushed: number; pushConfigured: boolean }> {
  if (!schoolId) throw new Error('A school is required to clear an alert.');
  // CHECK the state change before announcing anything. The old code ignored
  // this error and sent "All clear" even when the alert was still active in the
  // database — a dangerously false reassurance during e.g. a lightning hold
  // (Blocker 9). An all-clear is only emitted from a committed clear.
  const { error } = await db.from('urgent_alerts')
    .update({ active: false, cleared_at: new Date().toISOString() })
    .eq('active', true).eq('school_id', schoolId);
  if (error) throw new Error(error.message);

  const pushed = await broadcastPush(db, {
    title: '✅ All clear',
    body: 'The alert has been lifted. Activities may resume as directed by coaches.',
    url: '/portal',
    tag: 'altus-safety',
  }, schoolId);
  return { pushed, pushConfigured: pushReady() };
}
