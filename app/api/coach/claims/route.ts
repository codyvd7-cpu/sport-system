import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/coach/claims ────────────────────────────────────────────────────────
// Coaches review requests from players and parents to link to an athlete.
//
// A coach already knows whether that's really this child's parent, which makes
// them the right approver — no codes to generate, distribute or lose.
//
// GET   → pending claims, plus any athlete with more than one approved claim
// PATCH { claimId, action: 'approve' | 'reject', reason? }

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const db = getAdmin();
  const { data: claims } = await db.from('athlete_claims')
    .select('id,athlete_id,user_id,email,claim_type,status,approved_via,approved_by,approved_at,created_at')
    .eq('school_id', schoolId).order('created_at', { ascending: true });

  const all = claims || [];
  const athleteIds = [...new Set(all.map(c => c.athlete_id))];
  const { data: athletes } = athleteIds.length
    ? await db.from('athletes').select('id,full_name,team,parent_name,parent_email').in('id', athleteIds)
    : { data: [] };
  const aMap = new Map((athletes || []).map(a => [a.id, a]));

  const decorate = (c: typeof all[number]) => {
    const a = aMap.get(c.athlete_id);
    return {
      id: c.id,
      athleteId: c.athlete_id,
      athleteName: a?.full_name ?? 'Unknown athlete',
      team: a?.team ?? null,
      // Shown so a coach can compare the request against what the school holds
      onFileParent: a?.parent_name ?? null,
      onFileEmail: a?.parent_email ?? null,
      requestedBy: c.email,
      claimType: c.claim_type,
      status: c.status,
      approvedVia: c.approved_via,
      approvedBy: c.approved_by,
      requestedAt: c.created_at,
      emailMatchesFile: !!a?.parent_email && a.parent_email.trim().toLowerCase() === (c.email || '').trim().toLowerCase(),
    };
  };

  const approved = all.filter(c => c.status === 'approved');
  const countByAthlete = new Map<string, number>();
  for (const c of approved) countByAthlete.set(c.athlete_id, (countByAthlete.get(c.athlete_id) || 0) + 1);

  return NextResponse.json({
    pending: all.filter(c => c.status === 'pending').map(decorate),
    approved: approved.map(decorate),
    // A player and a parent both having access is expected. Three or more is
    // worth a second look, so it's surfaced rather than buried.
    multipleClaims: [...countByAthlete.entries()]
      .filter(([, n]) => n > 1)
      .map(([athleteId, n]) => ({
        athleteId,
        athleteName: aMap.get(athleteId)?.full_name ?? 'Unknown',
        count: n,
        claims: approved.filter(c => c.athlete_id === athleteId).map(decorate),
      })),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const claimId = String(body.claimId || '');
  const action = String(body.action || '');
  if (!claimId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: "claimId and action ('approve' | 'reject') are required." }, { status: 400 });
  }

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();
  const { data: claim } = await db.from('athlete_claims')
    .select('id,school_id,athlete_id,user_id').eq('id', claimId).maybeSingle();
  if (!claim || claim.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  if (action === 'approve') {
    await db.from('athlete_claims').update({
      status: 'approved', approved_via: 'coach',
      approved_by: auth.email || 'staff', approved_at: new Date().toISOString(),
    }).eq('id', claimId);
    // Only now does the user's profile actually point at the athlete
    await db.from('player_profiles').update({ athlete_id: claim.athlete_id }).eq('user_id', claim.user_id);
    return NextResponse.json({ ok: true, status: 'approved' });
  }

  await db.from('athlete_claims').update({
    status: 'rejected',
    rejected_reason: body.reason ? String(body.reason) : null,
    approved_by: auth.email || 'staff', approved_at: new Date().toISOString(),
  }).eq('id', claimId);
  // Revoke any existing link for this user on this athlete
  await db.from('player_profiles').update({ athlete_id: null })
    .eq('user_id', claim.user_id).eq('athlete_id', claim.athlete_id);

  return NextResponse.json({ ok: true, status: 'rejected' });
}
