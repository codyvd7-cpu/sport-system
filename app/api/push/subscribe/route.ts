import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientId } from '@/lib/rateLimit';

// Store / remove a browser push subscription. Open to anyone (parents on the
// portal aren't signed in) — endpoint URLs are unguessable, rate limiting
// keeps abuse out, and all we ever store is the subscription itself.

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`push-sub:${getClientId(req)}`, { max: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  try {
    const body = await req.json();
    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
    }
    // Optionally attach the signed-in player
    let userId: string | null = null;
    const auth = req.headers.get('authorization') || '';
    if (auth.startsWith('Bearer ')) {
      const { data } = await admin().auth.getUser(auth.slice(7));
      userId = data.user?.id || null;
    }
    const { error } = await admin().from('push_subscriptions').upsert({
      endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
      user_id: userId, label: String(body.label || 'portal').slice(0, 20),
    }, { onConflict: 'endpoint' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = String(body.endpoint || '');
    if (!endpoint) return NextResponse.json({ error: 'Endpoint required.' }, { status: 400 });
    await admin().from('push_subscriptions').delete().eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
