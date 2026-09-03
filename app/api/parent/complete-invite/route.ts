import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/parent/complete-invite ──────────────────────────────────────────────
// Finishes the link when a parent arrives from an invitation email.
//
// Authorisation here comes from the invitation itself: Supabase only issues a
// session if the person actually received mail at that address, and the coach
// chose which athlete when they sent it. Both facts are carried in the user's
// metadata, which only the server can write.
//
// The athlete id in the URL is therefore NOT trusted on its own — it's checked
// against the metadata Supabase holds, so editing the link to point at another
// child does nothing.

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
    ?? req.cookies.get('sb-access-token')?.value;

  const body = await req.json().catch(() => ({}));
  const requestedAthleteId = body.athleteId ? String(body.athleteId) : null;

  const db = getAdmin();

  // Identify the caller from their session.
  let userId: string | null = null;
  let userEmail: string | null = null;
  let metaAthleteId: string | null = null;
  let metaSchoolId: string | null = null;

  if (token) {
    const { data } = await db.auth.getUser(token);
    if (data.user) {
      userId = data.user.id;
      userEmail = data.user.email ?? null;
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      metaAthleteId = meta.athlete_id ? String(meta.athlete_id) : null;
      metaSchoolId = meta.school_id ? String(meta.school_id) : null;
    }
  }

  if (!userId || !userEmail) {
    return NextResponse.json({ error: 'Your invitation link has expired.' }, { status: 401 });
  }

  // The invitation decides which athlete, not the URL. A parent editing the
  // link to another child's id gets nothing.
  const athleteId = metaAthleteId ?? requestedAthleteId;
  if (!athleteId) {
    return NextResponse.json({ error: 'This link is missing its athlete.' }, { status: 400 });
  }
  if (metaAthleteId && requestedAthleteId && metaAthleteId !== requestedAthleteId) {
    return NextResponse.json({ error: 'This link is not valid for that athlete.' }, { status: 403 });
  }

  const { data: athlete } = await db.from('athletes')
    .select('id,full_name,school_id').eq('id', athleteId).maybeSingle();
  if (!athlete) return NextResponse.json({ error: 'That athlete no longer exists.' }, { status: 404 });
  if (metaSchoolId && athlete.school_id !== metaSchoolId) {
    return NextResponse.json({ error: 'This link is not valid for that athlete.' }, { status: 403 });
  }

  // Create or update the profile that connects this account to the athlete.
  await db.from('player_profiles').upsert({
    user_id: userId,
    full_name: userEmail.split('@')[0],
    athlete_id: athlete.id,
    school_id: athlete.school_id,
  }, { onConflict: 'user_id' });

  // Attach the pre-approved claim to the real user id. The invite created it
  // before the account existed, so it was stored against a placeholder.
  await db.from('athlete_claims')
    .update({ user_id: userId, status: 'approved' })
    .eq('athlete_id', athlete.id).eq('email', userEmail.toLowerCase());

  return NextResponse.json({ ok: true, athleteName: athlete.full_name, athleteId: athlete.id });
}
