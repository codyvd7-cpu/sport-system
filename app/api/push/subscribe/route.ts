import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { getAdmin } from '@/lib/supabaseAdmin';
import { verifyPlayer, requireAthleteContext } from '@/lib/playerAuth';

// Store / remove a browser push subscription. Open to anyone (parents on the
// portal aren't signed in) — endpoint URLs are unguessable, rate limiting
// keeps abuse out, and all we ever store is the subscription itself.

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`push-sub:${getClientId(req)}`, { max: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  try {
    const body = await req.json();
    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
    }
    // Optionally attach the signed-in player, and their school (so future
    // broadcasts can be scoped correctly — anonymous portal visitors have no
    // way to resolve a school yet, so this stays null for them for now).
    const player = await verifyPlayer(req);
    const userId: string | null = player?.userId || null;
    const ctx = player ? await requireAthleteContext(player.userId) : null;
    const db = getAdmin();
    // If this endpoint already belongs to an identified user, don't let a
    // different (or anonymous) caller take it over by re-posting it (AP-13).
    // Possession of a push endpoint is possession of that device, and the real
    // owner's own session resolves to the same user_id, so this only blocks
    // someone who merely learned another person's endpoint string.
    const { data: existing } = await db.from('push_subscriptions')
      .select('user_id').eq('endpoint', sub.endpoint).maybeSingle();
    if (existing?.user_id && existing.user_id !== userId) {
      return NextResponse.json({ error: 'Subscription belongs to another account.' }, { status: 403 });
    }
    const { error } = await db.from('push_subscriptions').upsert({
      endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
      user_id: userId, label: String(body.label || 'portal').slice(0, 20),
      school_id: ctx?.schoolId || null,
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
    const db = getAdmin();
    const { data: sub } = await db.from('push_subscriptions')
      .select('user_id').eq('endpoint', endpoint).maybeSingle();
    if (!sub) return NextResponse.json({ ok: true }); // already gone — idempotent
    // An owned subscription may only be removed by its owner (AP-13). Anonymous
    // portal subscriptions (no user_id) stay removable by endpoint — a logged-out
    // visitor has no other handle on their own device to unsubscribe it.
    if (sub.user_id) {
      const player = await verifyPlayer(req);
      if (!player || player.userId !== sub.user_id) {
        return NextResponse.json({ error: 'Not your subscription.' }, { status: 403 });
      }
    }
    await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
