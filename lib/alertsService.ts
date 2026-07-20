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

export async function getActiveAlert(db: SupabaseClient): Promise<ActiveAlert | null> {
  const { data } = await db.from('urgent_alerts')
    .select('id,type,message,created_by,created_at')
    .eq('active', true).order('created_at', { ascending: false }).limit(1);
  return (data?.[0] as ActiveAlert) || null;
}

const DEFAULT_MESSAGES: Record<string, string> = {
  lightning: 'Lightning detected — all outdoor training and matches are suspended. Move indoors immediately.',
  general: 'Safety alert — check with your coach before continuing.',
};

export async function activateAlert(db: SupabaseClient, opts: {
  message?: string; type?: string; actor: string;
}): Promise<{ alert: ActiveAlert; pushed: number; pushConfigured: boolean }> {
  const type = opts.type || 'lightning';
  const message = (opts.message || '').trim() || DEFAULT_MESSAGES[type] || DEFAULT_MESSAGES.general;

  // One active alert at a time: retire any previous one first
  await db.from('urgent_alerts')
    .update({ active: false, cleared_at: new Date().toISOString() }).eq('active', true);

  const { data, error } = await db.from('urgent_alerts')
    .insert([{ type, message, created_by: opts.actor }])
    .select('id,type,message,created_by,created_at').single();
  if (error) throw new Error(error.message);

  const pushed = await broadcastPush(db, {
    title: type === 'lightning' ? '⚡ LIGHTNING ALERT — St Benedict\u2019s Sport' : '⚠️ Safety Alert — St Benedict\u2019s Sport',
    body: message,
    url: '/portal',
    urgent: true,
    tag: 'altus-safety',
  });
  return { alert: data as ActiveAlert, pushed, pushConfigured: pushReady() };
}

export async function clearAlert(db: SupabaseClient): Promise<{ pushed: number; pushConfigured: boolean }> {
  await db.from('urgent_alerts')
    .update({ active: false, cleared_at: new Date().toISOString() }).eq('active', true);
  const pushed = await broadcastPush(db, {
    title: 'All clear — St Benedict\u2019s Sport',
    body: 'The alert has been lifted. Activities may resume as directed by coaches.',
    url: '/portal',
    tag: 'altus-safety',
  });
  return { pushed, pushConfigured: pushReady() };
}
