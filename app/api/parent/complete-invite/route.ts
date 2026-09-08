import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/parent/complete-invite ──────────────────────────────────────────────
// Finishes the link when a parent arrives from an invitation email.
//
// FIX for A01 (critical, audit ZIP 22): the previous version fell back to
// `body.athleteId` whenever user_metadata was empty — meta.athlete_id was set
// by a redirect URL parameter reflected into metadata by other code paths,
// and in the metadata-empty case the client-supplied athleteId was trusted
// outright. Any authenticated account could POST an arbitrary athleteId and
// this route would link it, no invitation required. The inline comment
// claiming "the URL is therefore NOT trusted" was not backed by the code —
// exactly the class of thing the audit's methodology exists to catch.
//
// The fix: authorization now comes ONLY from a genuine athlete_claims row —
// created server-side when the invite was sent, matched on email, status
// 'pending_activation', and consumed exactly once. user_metadata and the
// request body are read only as a LOOKUP HINT (which athlete to check first),
// never as proof of anything. If no matching claim row exists, this fails,
// full stop — there is no fallback path left.

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
    ?? req.cookies.get('sb-access-token')?.value;
  if (!token) return NextResponse.json({ error: 'Your invitation link has expired.' }, { status: 401 });

  const db = getAdmin();
  const { data } = await db.auth.getUser(token);
  const user = data.user;
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: 'Your invitation link has expired.' }, { status: 401 });
  }
  const userId = user.id;
  const email = user.email.toLowerCase();

  // The real authorization check: a server-created claim for THIS email,
  // still awaiting activation, not expired, not already consumed by another
  // account. This is what makes the invite unforgeable — it was written by
  // /api/parents/invite at send time, before this user's account existed, and
  // nothing the client sends can create or alter it.
  const { data: claim } = await db
    .from('athlete_claims')
    .select('id, athlete_id, school_id, status, expires_at, user_id')
    .eq('email', email)
    .eq('status', 'pending_activation')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (!claim) {
    return NextResponse.json({
      error: 'No active invitation found for this account. Ask your coach to resend it.',
    }, { status: 403 });
  }

  const { data: athlete } = await db.from('athletes')
    .select('id,full_name,school_id').eq('id', claim.athlete_id).maybeSingle();
  if (!athlete || athlete.school_id !== claim.school_id) {
    return NextResponse.json({ error: 'This invitation is no longer valid.' }, { status: 404 });
  }

  // Consume the claim atomically: move it from pending_activation to
  // approved, binding it to the now-real user id, and only where it is STILL
  // pending_activation — a concurrent request (e.g. the email link opened
  // twice) cannot both succeed and produce two different outcomes.
  const { data: consumed, error: consumeErr } = await db
    .from('athlete_claims')
    .update({ status: 'approved', user_id: userId, approved_at: new Date().toISOString() })
    .eq('id', claim.id)
    .eq('status', 'pending_activation')
    .select('id')
    .maybeSingle();

  if (consumeErr || !consumed) {
    return NextResponse.json({ error: 'This invitation was already used.' }, { status: 409 });
  }

  // One relationship per (user, athlete) is what athlete_claims already
  // models correctly; player_profiles.athlete_id is legacy single-athlete
  // convenience state for existing UI and is set to the most recent approval.
  // A18's "one profile / one athlete" limitation for a parent with multiple
  // children is a real, separate data-model gap — tracked, not silently
  // papered over here.
  await db.from('player_profiles').upsert({
    user_id: userId,
    full_name: email.split('@')[0],
    athlete_id: athlete.id,
    school_id: athlete.school_id,
  }, { onConflict: 'user_id' });

  return NextResponse.json({ ok: true, athleteName: athlete.full_name, athleteId: athlete.id });
}
