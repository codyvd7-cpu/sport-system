import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/coach/retest ────────────────────────────────────────────────────────
// Who is overdue for testing.
//
// Testing currently lives in two places — hp_test_results (the full battery,
// by term) and performance_tests (coach-side, ad hoc). Rather than pretending
// they're one table, this reports each honestly and uses hp_students.athlete_id
// to merge them wherever a link exists.
//
// "Overdue" is a plain rule: no result recorded within the window (default 90
// days). Not a predicted readiness date, not a model — a coach can see exactly
// why someone is on the list and disagree with the window if they want.

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const windowDays = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('days') || '90', 10) || 90, 14), 365);
  const cutoff = new Date(Date.now() - windowDays * 86400000);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const team = req.nextUrl.searchParams.get('team');

  const db = getAdmin();

  // ── HP side: the real testing battery ────────────────────────────────────
  const { data: hpStudents } = await db.from('hp_students')
    .select('id,full_name,grade,class_group,athlete_id')
    .eq('school_id', schoolId).eq('is_active', true);

  const hpIds = (hpStudents || []).map(s => s.id);
  const { data: hpResults } = hpIds.length
    ? await db.from('hp_test_results').select('student_id,created_at').in('student_id', hpIds)
    : { data: [] };

  const lastHpTest = new Map<string, string>();
  for (const r of hpResults || []) {
    const prev = lastHpTest.get(r.student_id);
    if (!prev || r.created_at > prev) lastHpTest.set(r.student_id, r.created_at);
  }

  const hpOverdue = (hpStudents || [])
    .map(s => {
      const last = lastHpTest.get(s.id) || null;
      const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
      return {
        source: 'hp' as const,
        id: s.id, athleteId: s.athlete_id, name: s.full_name,
        group: [s.grade, s.class_group].filter(Boolean).join(' '),
        lastTested: last ? last.slice(0, 10) : null,
        daysSince,
        reason: last ? `Last tested ${daysSince} days ago` : 'Never tested',
      };
    })
    .filter(x => x.lastTested === null || x.lastTested < cutoffDate);

  // ── Coach side: athletes with their own test records ─────────────────────
  let athQ = db.from('athletes').select('id,full_name,team').eq('school_id', schoolId).eq('is_active', true);
  if (team) athQ = athQ.eq('team', team);
  const { data: athletes } = await athQ;

  const athIds = (athletes || []).map(a => a.id);
  const { data: perfResults } = athIds.length
    ? await db.from('performance_tests').select('athlete_id,test_date').in('athlete_id', athIds)
    : { data: [] };

  const lastPerfTest = new Map<string, string>();
  for (const r of perfResults || []) {
    const prev = lastPerfTest.get(r.athlete_id);
    if (!prev || r.test_date > prev) lastPerfTest.set(r.athlete_id, r.test_date);
  }

  // Where an athlete IS linked to an HP student, their HP testing counts —
  // otherwise a properly-tested athlete would wrongly appear overdue simply
  // because their results live on the other side.
  const hpByAthlete = new Map<string, string>();
  for (const s of hpStudents || []) {
    if (!s.athlete_id) continue;
    const last = lastHpTest.get(s.id);
    if (last) hpByAthlete.set(s.athlete_id, last.slice(0, 10));
  }

  const athleteOverdue = (athletes || [])
    .map(a => {
      const own = lastPerfTest.get(a.id) || null;
      const viaHp = hpByAthlete.get(a.id) || null;
      const last = [own, viaHp].filter(Boolean).sort().pop() || null;
      const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
      return {
        source: 'athlete' as const,
        id: a.id, athleteId: a.id, name: a.full_name, group: a.team,
        lastTested: last, daysSince,
        linkedToHp: !!viaHp,
        reason: last ? `Last tested ${daysSince} days ago` : 'No test results recorded',
      };
    })
    .filter(x => x.lastTested === null || x.lastTested < cutoffDate);

  return NextResponse.json({
    windowDays,
    hp: {
      overdue: hpOverdue.sort((a, b) => (b.daysSince ?? 9999) - (a.daysSince ?? 9999)).slice(0, 100),
      total: hpOverdue.length,
      population: (hpStudents || []).length,
    },
    athletes: {
      overdue: athleteOverdue.sort((a, b) => (b.daysSince ?? 9999) - (a.daysSince ?? 9999)).slice(0, 100),
      total: athleteOverdue.length,
      population: (athletes || []).length,
    },
    // Surfaces the split honestly rather than hiding it: how much of the two
    // populations is actually connected.
    linkage: {
      hpLinked: (hpStudents || []).filter(s => s.athlete_id).length,
      hpTotal: (hpStudents || []).length,
    },
  });
}
