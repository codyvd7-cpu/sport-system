import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, ['owner','head_of_hockey','coach']);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const { subscription } = await req.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  await supabase.from('push_subscriptions').upsert([{
    email:    auth.email,
    endpoint: subscription.endpoint,
    p256dh:   subscription.keys.p256dh,
    auth_key: subscription.keys.auth,
    user_agent: req.headers.get('user-agent') || '',
  }], { onConflict: 'endpoint' });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req, ['owner','head_of_hockey','coach']);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const { endpoint } = await req.json();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('email', auth.email);

  return NextResponse.json({ ok: true });
}
