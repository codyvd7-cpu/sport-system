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
 * A broadcast MUST target exactly one school. Without a `schoolId` it reaches
 * NOBODY (returns 0) rather than every school's devices — a missing school is
 * never a licence to page the whole platform (Blocker 9). Legacy subscriptions
 * with a null `school_id` are quarantined: they do NOT implicitly join a
 * school's audience (that let a pre-multi-tenancy device receive every
 * school's alerts). Such devices rejoin when they resubscribe with a school.
 */
export async function broadcastPush(db: SupabaseClient, payload: PushPayload, schoolId?: string | null): Promise<number> {
  if (!pushReady()) return 0;
  if (!schoolId) return 0;
  const { data: subs } = await db.from('push_subscriptions')
    .select('id,endpoint,p256dh,auth').eq('school_id', schoolId);
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

/**
 * Targeted push to specific signed-in users' devices (by push_subscriptions
 * .user_id), rather than a whole-school broadcast. This is what makes a
 * personal alert land on a single athlete's wrist — "you're selected", "your
 * result is up" — instead of buzzing the whole school. Prunes dead endpoints.
 */
export async function pushToUsers(db: SupabaseClient, userIds: string[], payload: PushPayload): Promise<number> {
  if (!pushReady()) return 0;
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return 0;
  const { data: subs } = await db.from('push_subscriptions')
    .select('id,endpoint,p256dh,auth').in('user_id', ids);
  if (!subs?.length) return 0;
  const body = JSON.stringify(payload);
  let sent = 0;
  const dead: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.id);
    }
  }));
  if (dead.length) await db.from('push_subscriptions').delete().in('id', dead);
  return sent;
}
