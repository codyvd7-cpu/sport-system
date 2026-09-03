import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/parents/invite ──────────────────────────────────────────────────────
// Invites a parent by email, pre-linked to their child.
//
// Why this exists: the previous route asked a parent to create a password,
// search for their child by name, and then wait for a coach to approve the
// claim. Every established platform in this space has learned that parent
// onboarding dies at exactly that point — SportsEngine's own parent guide
// opens by telling people NOT to create a second account, because duplicate
// logins are their biggest support burden.
//
// The coach already knows who the parent is: their email is on the athlete's
// record. Sending mail to that address IS the verification, so the claim
// approval step is unnecessary for an invited parent. The self-claim flow
// stays as the fallback for anyone who wasn't invited.
//
// POST { athleteIds: [...] }  → invite the parent on each athlete's record
// POST { athleteId, email }   → invite a specific address

interface InviteResult {
  athleteId: string;
  athleteName: string;
  email: string | null;
  status: 'invited' | 'already_linked' | 'no_email' | 'failed';
  detail?: string;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

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
    .select('id,full_name,parent_email,parent_name,school_id')
    .eq('school_id', schoolId).in('id', ids);

  if (!athletes?.length) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data: school } = await db.from('schools')
    .select('name,slug').eq('id', schoolId).maybeSingle();

  const results: InviteResult[] = [];

  for (const ath of athletes) {
    const email = (body.email ? String(body.email) : ath.parent_email || '').trim().toLowerCase();

    if (!email) {
      results.push({ athleteId: ath.id, athleteName: ath.full_name, email: null, status: 'no_email' });
      continue;
    }

    // Already connected — re-inviting would create a confusing second account,
    // which is precisely the problem this flow exists to avoid.
    const { data: existingClaim } = await db.from('athlete_claims')
      .select('id,status').eq('athlete_id', ath.id).eq('email', email).maybeSingle();
    if (existingClaim?.status === 'approved') {
      results.push({ athleteId: ath.id, athleteName: ath.full_name, email, status: 'already_linked' });
      continue;
    }

    try {
      // Supabase sends the mail and owns the token lifecycle. redirectTo
      // carries the athlete, so the link finishes the linking on arrival.
      const { data: invited, error } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.altusperformance.co.za'}/parent/welcome?athlete=${ath.id}`,
        data: {
          role: 'parent',
          athlete_id: ath.id,
          athlete_name: ath.full_name,
          school_id: schoolId,
          school_name: school?.name ?? null,
        },
      });

      // An address that already has an account isn't a failure — they can use
      // the same link, they just won't get a second invitation mail.
      if (error && !/already been registered|already exists/i.test(error.message)) {
        results.push({ athleteId: ath.id, athleteName: ath.full_name, email, status: 'failed', detail: error.message });
        continue;
      }

      // Pre-approve the claim. The coach chose this athlete and the school
      // already holds this email — mailing it is the verification, so making
      // them wait for a second approval adds friction without adding safety.
      await db.from('athlete_claims').upsert({
        school_id: schoolId,
        athlete_id: ath.id,
        user_id: invited?.user?.id ?? '00000000-0000-0000-0000-000000000000',
        email,
        claim_type: 'parent',
        status: 'approved',
        approved_via: 'coach_invite',
        approved_by: auth.email || 'staff',
        approved_at: new Date().toISOString(),
      }, { onConflict: 'athlete_id,user_id' });

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
    failed: results.filter(r => r.status === 'failed').length,
    results,
  });
}
