import webpush from 'web-push';
import { SupabaseClient } from '@supabase/supabase-js';

// ─── Web push helper ────────────────────────────────────────────────────────────
// VAPID keys: generate once with `npx web-push generate-vapid-keys` and set
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  in Vercel env.

let configured = false;
export function pushReady(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails('mailto:info@altusperformance.co.za', pub, priv);
    configured = true;
  }
  return true;
}

export interface PushPayload { title: string; body: string; url?: string; urgent?: boolean; tag?: string; }

/**
 * Broadcast to stored subscriptions, prunes dead ones. Returns sent count.
 *
 * `schoolId`, when provided, scopes the broadcast to that school's own
 * subscribers — critical once more than one school exists, otherwise a
 * lightning alert at School A would push "training suspended" to School B's
 * parents too. Subscriptions from before multi-tenancy existed have no
 * school_id yet (nothing backfilled them, since there's no way to know which
 * school an old subscription belonged to after the fact) — those are still
 * included so existing subscribers don't silently stop getting alerts; they
 * age out naturally as devices resubscribe with a school_id going forward.
 */
export async function broadcastPush(db: SupabaseClient, payload: PushPayload, schoolId?: string | null): Promise<number> {
  if (!pushReady()) return 0;
  let query = db.from('push_subscriptions').select('id,endpoint,p256dh,auth');
  if (schoolId) query = query.or(`school_id.eq.${schoolId},school_id.is.null`);
  const { data: subs } = await query;
  if (!subs?.length) return 0;
  const body = JSON.stringify(payload);
  let sent = 0;
  const dead: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent++;
    } catch (e: any) {
      // 404/410 = subscription expired or revoked — clean it up
      if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.id);
    }
  }));
  if (dead.length) await db.from('push_subscriptions').delete().in('id', dead);
  return sent;
}
