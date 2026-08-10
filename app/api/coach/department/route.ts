import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/coach/department ────────────────────────────────────────────────────
// Department health for a Head of Sport.
//
// Reports COMPONENTS separately — testing coverage, injury load, attendance,
// development activity, coach engagement — each with its own status and the
// evidence behind it.
//
// It deliberately does NOT produce a single "department score". A composite
// number hides exactly the thing a head of sport needs to see: which specific
// area is slipping, and why. Averaging attendance with injury count produces a
// figure that feels precise and tells you nothing actionable.
//
// Each component returns: value, status ('good' | 'watch' | 'attention'), and
// a plain-language reason.

type Status = 'good' | 'watch' | 'attention';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const db = getAdmin();
  const now = Date.now();
  const d30 = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
  const d90 = new Date(now - 90 * 86400000).toISOString().slice(0, 10);
  const d14iso = new Date(now - 14 * 86400000).toISOString();

  const { data: athletes } = await db.from('athletes')
    .select('id,full_name,team,availability').eq('school_id', schoolId).eq('is_active', true);
  const roster = athletes || [];
  const ids = roster.map(a => a.id);

  if (ids.length === 0) {
    return NextResponse.json({ components: [], teams: [], squadSize: 0 });
  }

  const [attRes, testRes, hpRes, rtpRes, planRes, eventRes, staffRes] = await Promise.all([
    db.from('attendance').select('athlete_id,status,session_date').in('athlete_id', ids).gte('session_date', d30),
    db.from('performance_tests').select('athlete_id,test_date').in('athlete_id', ids).gte('test_date', d90),
    db.from('hp_students').select('id,athlete_id').eq('school_id', schoolId).eq('is_active', true),
    db.from('rtp_cases').select('id,athlete_id,reported_on,current_stage_id,medical_cleared_on').eq('school_id', schoolId).eq('status', 'open'),
    db.from('development_goals').select('id,athlete_id,status,review_date').eq('school_id', schoolId).eq('status', 'active'),
    db.from('athlete_events').select('id,actor,occurred_at').eq('school_id', schoolId).gte('occurred_at', d14iso),
    db.from('staff_roles').select('email,full_name,role,teams,is_active').eq('school_id', schoolId).eq('is_active', true),
  ]);

  // ── Attendance ────────────────────────────────────────────────────────────
  const attRows = attRes.data || [];
  const present = attRows.filter(r => ['present', 'late'].includes((r.status || '').toLowerCase())).length;
  const attRate = attRows.length ? Math.round((present / attRows.length) * 100) : null;
  const attStatus: Status = attRate == null ? 'watch' : attRate >= 85 ? 'good' : attRate >= 70 ? 'watch' : 'attention';

  // ── Testing coverage ──────────────────────────────────────────────────────
  // Counts an athlete as tested if they have EITHER a coach-side result or a
  // linked HP record with results — otherwise linked athletes look untested.
  const testedIds = new Set((testRes.data || []).map(r => r.athlete_id));
  const linkedAthleteIds = new Set((hpRes.data || []).map(s => s.athlete_id).filter(Boolean));
  const hpStudentIds = (hpRes.data || []).map(s => s.id);
  const { data: hpResults } = hpStudentIds.length
    ? await db.from('hp_test_results').select('student_id,created_at').in('student_id', hpStudentIds).gte('created_at', new Date(now - 90 * 86400000).toISOString())
    : { data: [] };
  const hpTestedStudents = new Set((hpResults || []).map(r => r.student_id));
  for (const s of hpRes.data || []) {
    if (s.athlete_id && hpTestedStudents.has(s.id)) testedIds.add(s.athlete_id);
  }
  const coverage = Math.round((testedIds.size / roster.length) * 100);
  const testStatus: Status = coverage >= 80 ? 'good' : coverage >= 50 ? 'watch' : 'attention';

  // ── Injury load ───────────────────────────────────────────────────────────
  const openCases = rtpRes.data || [];
  const unavailable = roster.filter(a => a.availability && a.availability !== 'Available');
  const injuryPct = Math.round((unavailable.length / roster.length) * 100);
  const stalled = openCases.filter(c => (now - new Date(c.reported_on).getTime()) / 86400000 > 28).length;
  const injuryStatus: Status = injuryPct >= 20 || stalled > 0 ? 'attention' : injuryPct >= 10 ? 'watch' : 'good';

  // ── Development activity ──────────────────────────────────────────────────
  const activeGoals = planRes.data || [];
  const athletesWithGoals = new Set(activeGoals.map(g => g.athlete_id)).size;
  const overdueReviews = activeGoals.filter(g => g.review_date && g.review_date < new Date().toISOString().slice(0, 10)).length;
  const devPct = Math.round((athletesWithGoals / roster.length) * 100);
  const devStatus: Status = devPct >= 40 ? 'good' : devPct >= 15 ? 'watch' : 'attention';

  // ── Coach engagement ──────────────────────────────────────────────────────
  const events = eventRes.data || [];
  const activeActors = new Set(events.map(e => e.actor).filter(a => a && a !== 'system' && a !== 'player'));
  const staff = (staffRes.data || []).filter(s => s.role === 'coach' || s.role === 'mic');
  const engagementStatus: Status = staff.length === 0 ? 'watch'
    : activeActors.size >= Math.ceil(staff.length * 0.6) ? 'good'
    : activeActors.size > 0 ? 'watch' : 'attention';

  const components = [
    {
      key: 'attendance', label: 'Attendance',
      value: attRate == null ? '—' : `${attRate}%`,
      status: attStatus,
      reason: attRate == null ? 'No sessions recorded in the last 30 days'
        : `${present} of ${attRows.length} marks present or late, last 30 days`,
      href: '/attendance',
    },
    {
      key: 'testing', label: 'Testing coverage',
      value: `${coverage}%`,
      status: testStatus,
      reason: `${testedIds.size} of ${roster.length} athletes tested in the last 90 days`,
      href: '/retest',
    },
    {
      key: 'injuries', label: 'Availability',
      value: `${unavailable.length}`,
      status: injuryStatus,
      reason: stalled > 0
        ? `${unavailable.length} unavailable · ${stalled} injury case${stalled === 1 ? '' : 's'} open over 4 weeks`
        : `${unavailable.length} of ${roster.length} not fully available · ${openCases.length} active case${openCases.length === 1 ? '' : 's'}`,
      href: '/athletes',
    },
    {
      key: 'development', label: 'Development plans',
      value: `${athletesWithGoals}`,
      status: devStatus,
      reason: overdueReviews > 0
        ? `${athletesWithGoals} athletes with active goals · ${overdueReviews} review${overdueReviews === 1 ? '' : 's'} overdue`
        : `${athletesWithGoals} of ${roster.length} athletes have an active goal`,
      href: '/athletes',
    },
    {
      key: 'engagement', label: 'Coach activity',
      value: `${activeActors.size}/${staff.length}`,
      status: engagementStatus,
      reason: staff.length === 0 ? 'No coaches assigned'
        : `${activeActors.size} of ${staff.length} coaches recorded activity in the last 14 days`,
      href: '/coaches',
    },
  ];

  // ── Per-team breakdown ────────────────────────────────────────────────────
  const teams = [...new Set(roster.map(a => a.team).filter(Boolean))].map(team => {
    const squad = roster.filter(a => a.team === team);
    const squadIds = new Set(squad.map(a => a.id));
    const ta = attRows.filter(r => squadIds.has(r.athlete_id));
    const tp = ta.filter(r => ['present', 'late'].includes((r.status || '').toLowerCase())).length;
    return {
      team,
      squad: squad.length,
      attendance: ta.length ? Math.round((tp / ta.length) * 100) : null,
      unavailable: squad.filter(a => a.availability && a.availability !== 'Available').length,
      tested: squad.filter(a => testedIds.has(a.id)).length,
      openCases: openCases.filter(c => squadIds.has(c.athlete_id)).length,
    };
  }).sort((a, b) => a.team.localeCompare(b.team));

  return NextResponse.json({
    squadSize: roster.length,
    components,
    teams,
    linkage: { hpLinked: linkedAthleteIds.size, hpTotal: (hpRes.data || []).length },
  });
}
