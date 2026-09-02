import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/coach/setup-progress ────────────────────────────────────────────────
// How far through initial setup a school is, so the dashboard can show a new
// head of sport what to do next — and stop showing it once they're running.
//
// Counts only; no personal data leaves the database here.

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const db = getAdmin();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [athletes, coaches, fixtures, codes, sports] = await Promise.all([
    db.from('athletes').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('is_active', true),
    db.from('staff_roles').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('is_active', true),
    db.from('portal_fixtures').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId),
    db.from('portal_access_codes').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId),
    db.from('school_sports').select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('is_active', true),
  ]);

  // Attendance is the signal that the department is genuinely using Altus
  // rather than just having data loaded into it.
  const { data: athleteIds } = await db.from('athletes')
    .select('id').eq('school_id', schoolId).limit(500);
  let attendanceTaken = false;
  if (athleteIds?.length) {
    const { count } = await db.from('attendance')
      .select('id', { count: 'exact', head: true })
      .in('athlete_id', athleteIds.map(a => a.id))
      .gte('session_date', monthAgo);
    attendanceTaken = (count ?? 0) > 0;
  }

  return NextResponse.json({
    sports: sports.count ?? 0,
    coaches: coaches.count ?? 0,
    athletes: athletes.count ?? 0,
    fixtures: fixtures.count ?? 0,
    portalCodes: codes.count ?? 0,
    attendanceTaken,
  });
}
