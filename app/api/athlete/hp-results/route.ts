import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { GRADE8_TESTS, GRADE9_TESTS, getTier, fmtValueWithUnit, TERM_ORDER, type TestKey } from '@/lib/hpTests';

// ─── /api/athlete/hp-results ──────────────────────────────────────────────────
// The payoff of linking HP students to athletes: a coach opening an athlete
// profile can see that athlete's actual testing battery results, instead of
// having to go to the HP module and find the same person again.
//
// Returns nothing (linked: false) when there's no link, rather than guessing
// by name — a wrong match here would show one child's results on another
// child's profile.

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const athleteId = req.nextUrl.searchParams.get('athleteId') || '';
  if (!athleteId) return NextResponse.json({ error: 'athleteId required.' }, { status: 400 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();

  const { data: athlete } = await db.from('athletes').select('school_id').eq('id', athleteId).maybeSingle();
  if (!athlete || athlete.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data: student } = await db.from('hp_students')
    .select('id,full_name,grade,class_group').eq('athlete_id', athleteId).maybeSingle();

  if (!student) {
    return NextResponse.json({
      linked: false,
      message: 'This athlete is not linked to an HP student record.',
    });
  }

  const { data: results } = await db.from('hp_test_results')
    .select('*').eq('student_id', student.id).order('year').order('created_at');

  const rows = results || [];
  const tests = student.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;

  // Latest recorded value per test, plus the previous one for direction of
  // travel. Only a genuine change is reported — no smoothing, no projection.
  const summary = tests.map(t => {
    const series = rows
      .map(r => ({
        value: r[t.key] as number | null,
        term: r.term as string,
        year: r.year as number,
        date: r.test_date as string | null,
      }))
      .filter(x => x.value != null)
      // Term comes back as a plain string from the database, so index against
      // TERM_ORDER defensively rather than asserting the union type.
      .sort((a, b) => {
        const ti = (t: string) => (TERM_ORDER as readonly string[]).indexOf(t);
        return (a.year - b.year) || (ti(a.term) - ti(b.term));
      });

    if (series.length === 0) {
      return { key: t.key, label: t.label, unit: t.unit, value: null, formatted: null, tier: null, previous: null, direction: null, history: [] };
    }

    const latest = series[series.length - 1];
    const previous = series.length > 1 ? series[series.length - 2] : null;
    const tier = getTier(t.key as TestKey, latest.value as number, t.lower);

    // "lower is better" tests improve when the number goes DOWN — getting this
    // backwards was a real bug in this codebase before, so it's explicit here.
    let direction: 'improved' | 'declined' | 'unchanged' | null = null;
    if (previous && previous.value !== latest.value) {
      const wentDown = (latest.value as number) < (previous.value as number);
      direction = (t.lower ? wentDown : !wentDown) ? 'improved' : 'declined';
    } else if (previous) {
      direction = 'unchanged';
    }

    return {
      key: t.key,
      label: t.label,
      unit: t.unit,
      category: t.cat,
      value: latest.value,
      formatted: fmtValueWithUnit(t.key as TestKey, latest.value as number),
      term: `${latest.term} ${latest.year}`,
      date: latest.date,
      tier: { label: tier.label, color: tier.color },
      previous: previous
        ? { value: previous.value, formatted: fmtValueWithUnit(t.key as TestKey, previous.value as number), term: `${previous.term} ${previous.year}` }
        : null,
      direction,
      history: series.map(s => ({ value: s.value, term: `${s.term} ${s.year}`, date: s.date })),
    };
  });

  const tested = summary.filter(s => s.value != null);
  const lastTested = rows.length
    ? rows.map(r => r.test_date).filter(Boolean).sort().pop() ?? null
    : null;

  return NextResponse.json({
    linked: true,
    student: { id: student.id, name: student.full_name, grade: student.grade, classGroup: student.class_group },
    tests: summary,
    counts: { tested: tested.length, total: summary.length, sessions: rows.length },
    lastTested,
  });
}
