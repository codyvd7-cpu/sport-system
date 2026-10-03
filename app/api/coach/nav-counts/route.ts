import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/coach/nav-counts ────────────────────────────────────────────────────
// The small live numbers that make the coach launcher feel alive rather than
// decorated: how many athletes need attention, how many players are waiting to
// be enrolled, how many are overdue a retest. One cheap call, cached briefly.
//
// Deliberately minimal — just counts, scoped to the caller's school. No names,
// no detail; the pages themselves hold that.

export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({});
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({}, { status: 401 });
  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({}, { status: 403 });

  const db = getAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const [pendingR, unavailR, fixturesTodayR] = await Promise.all([
    // Players who self-registered and aren't in a team yet.
    db.from('athletes').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('pending_team', true).eq('is_active', true),
    // Athletes currently flagged unavailable/modified — the attention signal.
    db.from('athletes').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('is_active', true).neq('availability', 'Available'),
    // Fixtures today, so "Selection" can nudge.
    db.from('portal_fixtures').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('fixture_date', today),
  ]);

  return NextResponse.json({
    newPlayers: pendingR.count ?? 0,
    needsAttention: unavailR.count ?? 0,
    fixturesToday: fixturesTodayR.count ?? 0,
  });
}
