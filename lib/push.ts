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

/** Broadcast to every stored subscription; prunes dead ones. Returns sent count. */
export async function broadcastPush(db: SupabaseClient, payload: PushPayload): Promise<number> {
  if (!pushReady()) return 0;
  const { data: subs } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth');
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
