import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { createClient } from '@supabase/supabase-js';

// Web Push implementation using VAPID
async function sendPushNotification(subscription: any, payload: any, vapidKeys: { publicKey: string; privateKey: string; email: string }) {
  const { default: webpush } = await import('web-push');
  
  webpush.setVapidDetails(
    `mailto:${vapidKeys.email}`,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  await webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
    JSON.stringify(payload)
  );
}

export async function POST(req: NextRequest) {
  const vapidPublic  = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!vapidPublic || !vapidPrivate || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const { title, body, url, targetEmails } = await req.json();
  if (!title || !body) return NextResponse.json({ error: 'Title and body required.' }, { status: 400 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Get subscriptions — target specific emails or all
  let query = supabase.from('push_subscriptions').select('*');
  if (targetEmails?.length) query = query.in('email', targetEmails);

  const { data: subs } = await query;
  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

  const payload = { title, body, url: url || '/dashboard', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' };
  const vapidKeys = { publicKey: vapidPublic, privateKey: vapidPrivate, email: 'cody@kinetiqsport.co.za' };

  let sent = 0, failed = 0;
  const staleEndpoints: string[] = [];

  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await sendPushNotification(sub, payload, vapidKeys);
      sent++;
    } catch (e: any) {
      failed++;
      // 410 Gone = subscription expired, clean it up
      if (e.statusCode === 410 || e.statusCode === 404) {
        staleEndpoints.push(sub.endpoint);
      }
    }
  }));

  // Clean up stale subscriptions
  if (staleEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
  }

  return NextResponse.json({ ok: true, sent, failed });
}