import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  try {
    const { subscription, email } = await req.json();
    if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    await supabase.from('push_subscriptions').upsert([{
      email: email || 'unknown',
      endpoint: subscription.endpoint,
      p256dh:   subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
    }], { onConflict: 'endpoint' });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  try {
    const { endpoint } = await req.json();
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
