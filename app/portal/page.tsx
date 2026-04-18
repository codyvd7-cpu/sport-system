'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type WeekPlan = {
  id: string;
  created_at: string | null;
  week_label: string;
  published: boolean;
};

type WeekPlanItem = {
  id: string;
  created_at: string | null;
  week_plan_id: string;
  day_label: string;
  title: string;
  details: string;
  sort_order: number;
};

type Reminder = {
  id: string;
  created_at: string | null;
  title: string;
  details: string;
  is_published: boolean;
  sort_order: number;
};

type Fixture = {
  id: string;
  created_at: string | null;
  team: string;
  opponent: string;
  fixture_date: string;
  venue: string;
  is_published: boolean;
  sort_order: number;
};

type Result = {
  id: string;
  created_at: string | null;
  team: string;
  opponent: string;
  result_date: string;
  final_score: string;
  goal_scorers: string;
  is_published: boolean;
  sort_order: number;
};

type Program = {
  id: string;
  created_at: string | null;
  title: string;
  category: string;
  day_label: string;
  details: string;
  is_published: boolean;
  sort_order: number;
};

type Athlete = {
  id: string;
  name: string;
  team: string;
  sport: string;
};

type AttendanceRecord = {
  athlete_id: string;
  session_date: string;
  status: string;
  session_type: string;
};

type PerformanceRecord = {
  athlete_id: string;
  test_date: string;
  test_type: string;
  result: number | null;
  unit: string;
};

type GymLeaderboardRow = {
  athleteId: string;
  athleteName: string;
  team: string;
  attendanceRate: number;
  gymSessions: number;
  score: number;
};

type PerformanceLeaderboardRow = {
  athleteId: string;
  athleteName: string;
  team: string;
  testCount: number;
  daysSinceTest: number | null;
  score: number;
};

function firstString(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return String(value);
  }
  return '';
}

function firstBoolean(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return false;
}

function firstNumber(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysSince(dateString?: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeWeekPlan(row: GenericRow): WeekPlan {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
    week_label: firstString(row.week_label) || 'Week at a Glance',
    published: firstBoolean(row.published),
  };
}

function normalizeWeekPlanItem(row: GenericRow): WeekPlanItem {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
    week_plan_id: firstValue(row.week_plan_id),
    day_label: firstString(row.day_label),
    title: firstString(row.title),
    details: firstString(row.details),
    sort_order: firstNumber(row.sort_order) ?? 0,
  };
}

function normalizeReminder(row: GenericRow): Reminder {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
    title: firstString(row.title),
    details: firstString(row.details),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order) ?? 0,
  };
}

function normalizeFixture(row: GenericRow): Fixture {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
    team: firstString(row.team),
    opponent: firstString(row.opponent),
    fixture_date: firstString(row.fixture_date),
    venue: firstString(row.venue),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order) ?? 0,
  };
}

function normalizeResult(row: GenericRow): Result {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
    team: firstString(row.team),
    opponent: firstString(row.opponent),
    result_date: firstString(row.result_date),
    final_score: firstString(row.final_score, row.score),
    goal_scorers: firstString(row.goal_scorers),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order) ?? 0,
  };
}

function normalizeProgram(row: GenericRow): Program {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
    title: firstString(row.title),
    category: firstString(row.category) || 'Gym',
    day_label: firstString(row.day_label),
    details: firstString(row.details),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order) ?? 0,
  };
}

function normalizeAthlete(row: GenericRow): Athlete {
  return {
    id: firstValue(row.id, row.athlete_id, crypto.randomUUID()),
    name:
      firstString(
        row.name,
        row.full_name,
        row.athlete_name,
        row.player_name,
        row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : '',
        row.first_name
      ) || 'Unknown Athlete',
    team: firstString(row.team, row.team_name, row.squad, row.group_name) || 'Unassigned',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
  };
}

function normalizeAttendance(row: GenericRow): AttendanceRecord {
  return {
    athlete_id: firstValue(row.athlete_id),
    session_date: firstString(row.session_date),
    status: firstString(row.status),
    session_type: firstString(row.session_type),
  };
}

function normalizePerformance(row: GenericRow): PerformanceRecord {
  return {
    athlete_id: firstValue(row.athlete_id),
    test_date: firstString(row.test_date),
    test_type: firstString(row.test_type),
    result: firstNumber(row.result),
    unit: firstString(row.unit),
  };
}

export default function PortalPage() {
  const [weekPlanRows, setWeekPlanRows] = useState<GenericRow[]>([]);
  const [weekPlanItemRows, setWeekPlanItemRows] = useState<GenericRow[]>([]);
  const [reminderRows, setReminderRows] = useState<GenericRow[]>([]);
  const [fixtureRows, setFixtureRows] = useState<GenericRow[]>([]);
  const [resultRows, setResultRows] = useState<GenericRow[]>([]);
  const [programRows, setProgramRows] = useState<GenericRow[]>([]);
  const [athleteRows, setAthleteRows] = useState<GenericRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<GenericRow[]>([]);
  const [performanceRows, setPerformanceRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadPortalData() {
    setLoading(true);
    setError('');

    const [
      weekPlansRes,
      weekPlanItemsRes,
      remindersRes,
      fixturesRes,
      resultsRes,
      programsRes,
      athletesRes,
      attendanceRes,
      performanceRes,
    ] = await Promise.all([
      supabase.from('PortalWeekPlan').select('*').eq('published', true).order('created_at', { ascending: false }),
      supabase.from('PortalWeekPlanItems').select('*').order('sort_order', { ascending: true }),
      supabase.from('PortalReminders').select('*').eq('is_published', true).order('sort_order', { ascending: true }),
      supabase.from('PortalFixtures').select('*').eq('is_published', true).order('fixture_date', { ascending: true }).order('sort_order', { ascending: true }),
      supabase.from('PortalResults').select('*').eq('is_published', true).order('result_date', { ascending: false }).order('sort_order', { ascending: true }),
      supabase.from('PortalPrograms').select('*').eq('is_published', true).order('sort_order', { ascending: true }),
      supabase.from('athletes').select('*'),
      supabase.from('Attendance').select('*'),
      supabase.from('Performance').select('*'),
    ]);

    if (
      weekPlansRes.error ||
      weekPlanItemsRes.error ||
      remindersRes.error ||
      fixturesRes.error ||
      resultsRes.error ||
      programsRes.error ||
      athletesRes.error ||
      attendanceRes.error ||
      performanceRes.error
    ) {
      setError(
        weekPlansRes.error?.message ||
          weekPlanItemsRes.error?.message ||
          remindersRes.error?.message ||
          fixturesRes.error?.message ||
          resultsRes.error?.message ||
          programsRes.error?.message ||
          athletesRes.error?.message ||
          attendanceRes.error?.message ||
          performanceRes.error?.message ||
          'Failed to load portal data.'
      );
      setLoading(false);
      return;
    }

    setWeekPlanRows((weekPlansRes.data as GenericRow[]) || []);
    setWeekPlanItemRows((weekPlanItemsRes.data as GenericRow[]) || []);
    setReminderRows((remindersRes.data as GenericRow[]) || []);
    setFixtureRows((fixturesRes.data as GenericRow[]) || []);
    setResultRows((resultsRes.data as GenericRow[]) || []);
    setProgramRows((programsRes.data as GenericRow[]) || []);
    setAthleteRows((athletesRes.data as GenericRow[]) || []);
    setAttendanceRows((attendanceRes.data as GenericRow[]) || []);
    setPerformanceRows((performanceRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPortalData();
  }, []);

  const weekPlans = useMemo(() => weekPlanRows.map(normalizeWeekPlan), [weekPlanRows]);
  const weekPlanItems = useMemo(() => weekPlanItemRows.map(normalizeWeekPlanItem), [weekPlanItemRows]);
  const reminders = useMemo(() => reminderRows.map(normalizeReminder), [reminderRows]);
  const fixtures = useMemo(() => fixtureRows.map(normalizeFixture), [fixtureRows]);
  const results = useMemo(() => resultRows.map(normalizeResult), [resultRows]);
  const programs = useMemo(() => programRows.map(normalizeProgram).slice(0, 4), [programRows]);
  const athletes = useMemo(() => athleteRows.map(normalizeAthlete), [athleteRows]);
  const attendance = useMemo(() => attendanceRows.map(normalizeAttendance), [attendanceRows]);
  const performance = useMemo(() => performanceRows.map(normalizePerformance), [performanceRows]);

  const latestWeekPlan = useMemo(() => {
    return weekPlans.length > 0 ? weekPlans[0] : null;
  }, [weekPlans]);

  const currentWeekItems = useMemo(() => {
    if (!latestWeekPlan) return [];
    return weekPlanItems
      .filter((item) => item.week_plan_id === latestWeekPlan.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [latestWeekPlan, weekPlanItems]);

  const athleteMap = useMemo(() => {
    const map = new Map<string, Athlete>();
    athletes.forEach((athlete) => map.set(athlete.id, athlete));
    return map;
  }, [athletes]);

  const gymLeaderboard = useMemo(() => {
    const groupedAttendance = new Map<
      string,
      { total: number; positive: number; gymSessions: number }
    >();

    attendance.forEach((entry) => {
      const current = groupedAttendance.get(entry.athlete_id) || {
        total: 0,
        positive: 0,
        gymSessions: 0,
      };

      current.total += 1;

      const status = entry.status.toLowerCase();
      if (status === 'present' || status === 'late') {
        current.positive += 1;
      }

      if (entry.session_type.toLowerCase() === 'gym') {
        current.gymSessions += 1;
      }

      groupedAttendance.set(entry.athlete_id, current);
    });

    const rows: GymLeaderboardRow[] = athletes
      .map((athlete) => {
        const att = groupedAttendance.get(athlete.id);
        const total = att?.total ?? 0;
        const positive = att?.positive ?? 0;
        const gymSessions = att?.gymSessions ?? 0;
        const attendanceRate = total > 0 ? Math.round((positive / total) * 100) : 0;

        const score = Math.round(attendanceRate * 0.7 + Math.min(gymSessions * 6, 30));

        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          team: athlete.team,
          attendanceRate,
          gymSessions,
          score,
        };
      })
      .filter((row) => row.gymSessions > 0 || row.attendanceRate > 0)
      .sort((a, b) => b.score - a.score || b.gymSessions - a.gymSessions || b.attendanceRate - a.attendanceRate)
      .slice(0, 5);

    return rows;
  }, [athletes, attendance]);

  const performanceLeaderboard = useMemo(() => {
    const groupedPerformance = new Map<
      string,
      { count: number; latestDate: string | null }
    >();

    performance.forEach((entry) => {
      const current = groupedPerformance.get(entry.athlete_id) || {
        count: 0,
        latestDate: null,
      };

      current.count += 1;

      const currentLast = current.latestDate ? new Date(current.latestDate).getTime() : 0;
      const entryTime = entry.test_date ? new Date(entry.test_date).getTime() : 0;
      if (entryTime > currentLast) {
        current.latestDate = entry.test_date;
      }

      groupedPerformance.set(entry.athlete_id, current);
    });

    const rows: PerformanceLeaderboardRow[] = athletes
      .map((athlete) => {
        const perf = groupedPerformance.get(athlete.id);
        const testCount = perf?.count ?? 0;
        const latestDate = perf?.latestDate ?? null;
        const staleDays = daysSince(latestDate);

        let recencyScore = 0;
        if (staleDays === null) recencyScore = 0;
        else if (staleDays <= 7) recencyScore = 40;
        else if (staleDays <= 14) recencyScore = 30;
        else if (staleDays <= 30) recencyScore = 20;
        else recencyScore = 5;

        const score = Math.round(Math.min(testCount * 10, 60) + recencyScore);

        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          team: athlete.team,
          testCount,
          daysSinceTest: staleDays,
          score,
        };
      })
      .filter((row) => row.testCount > 0)
      .sort((a, b) => b.score - a.score || b.testCount - a.testCount || (a.daysSinceTest ?? 9999) - (b.daysSinceTest ?? 9999))
      .slice(0, 5);

    return rows;
  }, [athletes, performance]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            St Benedict&apos;s College
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Parent &amp; Player Portal
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Week at a glance, reminders, fixtures, results, programs, and public leaderboards.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2.5 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
            >
              Coach Login
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
            Loading portal...
          </div>
        ) : (
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Week at a Glance</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {latestWeekPlan?.week_label || 'Current week overview'}
                </p>
              </div>

              {currentWeekItems.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                  No week plan published yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {currentWeekItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                    >
                      <p className="text-xs uppercase tracking-wide text-emerald-400">
                        {item.day_label}
                      </p>
                      <h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {item.details || 'No extra details.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Important Reminders</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Key reminders for players and parents.
                </p>
              </div>

              {reminders.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                  No reminders published yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                    >
                      <p className="text-sm font-semibold text-white">{reminder.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{reminder.details || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Fixtures</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Upcoming fixtures with venue information.
                  </p>
                </div>

                {fixtures.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No fixtures published yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fixtures.map((fixture) => (
                      <div
                        key={fixture.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {fixture.team} vs {fixture.opponent}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatDate(fixture.fixture_date)} • {fixture.venue || 'Venue TBC'}
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          Fixture
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Results</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Final scores and goal scorers.
                  </p>
                </div>

                {results.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No results published yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {result.team} vs {result.opponent}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {formatDate(result.result_date)}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                              Goal Scorers
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {result.goal_scorers || 'Not listed'}
                            </p>
                          </div>

                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                            {result.final_score || '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Programs</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Current gym, mobility, and recovery programs available for players.
                </p>
              </div>

              {programs.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                  No programs published yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {programs.map((program) => (
                    <div
                      key={program.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                          {program.category || 'Program'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {program.day_label || '—'}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-white">{program.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {program.details || 'No details added yet.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Gym Leaderboard</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Based on gym-related attendance and overall attendance quality.
                  </p>
                </div>

                {gymLeaderboard.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No gym leaderboard data yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gymLeaderboard.map((athlete, index) => (
                      <div
                        key={athlete.athleteId}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              #{index + 1} {athlete.athleteName}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">{athlete.team}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-200">
                              Score {athlete.score}
                            </span>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              {athlete.gymSessions} gym sessions
                            </span>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              {athlete.attendanceRate}% attendance
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Performance Leaderboard</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Based on performance data volume and testing recency.
                  </p>
                </div>

                {performanceLeaderboard.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No performance leaderboard data yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {performanceLeaderboard.map((athlete, index) => (
                      <div
                        key={athlete.athleteId}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              #{index + 1} {athlete.athleteName}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">{athlete.team}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-200">
                              Score {athlete.score}
                            </span>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              {athlete.testCount} tests
                            </span>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              {athlete.daysSinceTest === null ? 'No recent date' : `${athlete.daysSinceTest} days ago`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}