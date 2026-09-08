import { NextRequest, NextResponse } from 'next/server';
import { requireStaffContext, canActOnTeam } from '@/lib/staffAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/parents/invite ──────────────────────────────────────────────────────
// Invites a parent by email, pre-linked to their child.
//
// FIX for A01/A18 (audit ZIP 22): invitations used to be written straight to
// 'approved' status against a shared placeholder UUID
// (00000000-0000-0000-0000-000000000000), because the real parent account
// doesn't exist yet at send time. That had two consequences:
//   - complete-invite had no genuine per-invite record to check, so it fell
//     back to trusting the client (A01)
//   - every unresolved invite collided on that same placeholder id under
//     UNIQUE(athlete_id, user_id), so a second pending invite for a
//     different child could silently overwrite the first (A18)
//
// Fix: invites are now written as status 'pending_activation' with a real
// expiry (7 days) and no user_id at all until a real account activates them.
// See supabase-fix-a01-a18-claims.sql for the schema change this depends on.
//
// FIX for A10: this route previously called authenticateRequest(req) with no
// role check, which accepts ANY authenticated Supabase user, not specifically
// active staff. Replaced with requireStaffContext, which independently
// re-verifies is_active on both the staff row and the school, and confirms
// team ownership before a coach can invite a parent for that team's athlete.

interface InviteResult {
  athleteId: string;
  athleteName: string;
  email: string | null;
  status: 'invited' | 'already_linked' | 'no_email' | 'not_permitted' | 'failed';
  detail?: string;
}

const INVITE_TTL_DAYS = 7;

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const ctx = await requireStaffContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.athleteIds)
    ? body.athleteIds.map(String)
    : body.athleteId ? [String(body.athleteId)] : [];

  if (ids.length === 0) return NextResponse.json({ error: 'No athletes selected.' }, { status: 400 });
  if (ids.length > 200) return NextResponse.json({ error: 'Invite up to 200 at a time.' }, { status: 400 });

  const db = getAdmin();

  // Only athletes in the caller's own school. Client-supplied ids are never
  // trusted on their own.
  const { data: athletes } = await db.from('athletes')
    .select('id,full_name,team,parent_email,parent_name,school_id')
    .eq('school_id', ctx.schoolId).in('id', ids);

  if (!athletes?.length) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data: school } = await db.from('schools')
    .select('name,slug').eq('id', ctx.schoolId).maybeSingle();

  const results: InviteResult[] = [];

  for (const ath of athletes) {
    // A10/A11/A12: a team-scoped coach could previously invite a parent for
    // any athlete in the school, since only school_id was ever compared.
    if (!canActOnTeam(ctx, ath.team)) {
      results.push({ athleteId: ath.id, athleteName: ath.full_name, email: null, status: 'not_permitted' });
      continue;
    }

    const email = (body.email ? String(body.email) : ath.parent_email || '').trim().toLowerCase();

    if (!email) {
      results.push({ athleteId: ath.id, athleteName: ath.full_name, email: null, status: 'no_email' });
      continue;
    }

    const { data: existingClaim } = await db.from('athlete_claims')
      .select('id,status').eq('athlete_id', ath.id).eq('email', email)
      .in('status', ['approved', 'pending_activation'])
      .order('created_at', { ascending: false }).maybeSingle();
    if (existingClaim?.status === 'approved') {
      results.push({ athleteId: ath.id, athleteName: ath.full_name, email, status: 'already_linked' });
      continue;
    }

    try {
      const { error } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.altusperformance.co.za'}/parent/welcome?athlete=${ath.id}`,
        data: { role: 'parent', athlete_id: ath.id, athlete_name: ath.full_name, school_id: ctx.schoolId, school_name: school?.name ?? null },
      });

      if (error && !/already been registered|already exists/i.test(error.message)) {
        results.push({ athleteId: ath.id, athleteName: ath.full_name, email, status: 'failed', detail: error.message });
        continue;
      }

      // The claim is the authorization record, written server-side, with no
      // user_id until a real account consumes it. onConflict targets the new
      // partial unique index (athlete_id, email) WHERE pending_activation —
      // re-inviting the same parent for the same child refreshes the expiry
      // rather than creating a duplicate or colliding with an unrelated one.
      const { error: claimErr } = await db.from('athlete_claims').upsert({
        school_id: ctx.schoolId,
        athlete_id: ath.id,
        user_id: null,
        email,
        claim_type: 'parent',
        status: 'pending_activation',
        approved_via: 'coach_invite',
        approved_by: ctx.email,
        expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString(),
      }, { onConflict: 'athlete_id,email' });

      if (claimErr) {
        results.push({ athleteId: ath.id, athleteName: ath.full_name, email, status: 'failed', detail: claimErr.message });
        continue;
      }

      results.push({ athleteId: ath.id, athleteName: ath.full_name, email, status: 'invited' });
    } catch (e) {
      results.push({
        athleteId: ath.id, athleteName: ath.full_name, email,
        status: 'failed', detail: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    invited: results.filter(r => r.status === 'invited').length,
    alreadyLinked: results.filter(r => r.status === 'already_linked').length,
    noEmail: results.filter(r => r.status === 'no_email').length,
    notPermitted: results.filter(r => r.status === 'not_permitted').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  });
}
