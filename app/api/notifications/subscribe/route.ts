import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/notifications/subscribe ───────────────────────────────────────────────
// Adapter for the staff NotificationBell — consolidated onto the canonical
// push_subscriptions schema (lib/push.ts / supabase-alerts-push.sql), the same
// table /api/push/subscribe and /api/alerts already use. Previously this route
// wrote email + auth_key into columns that don't exist on that table, so staff
// "enable notifications" subscriptions were silently going nowhere.

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  try {
    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
    }
    const { error } = await getAdmin().from('push_subscriptions').upsert({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      label: 'staff',
    }, { onConflict: 'endpoint' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: 'Endpoint required.' }, { status: 400 });
    await getAdmin().from('push_subscriptions').delete().eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
