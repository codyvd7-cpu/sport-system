'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type WeekPlan = {
  id: string;
  week_label: string;
  published: boolean;
};

type WeekPlanItem = {
  id: string;
  week_plan_id: string;
  day_label: string;
  title: string;
  details: string;
  sort_order: number;
};

type Fixture = {
  id: string;
  team: string;
  opponent: string;
  fixture_date: string;
  venue: string;
  is_published: boolean;
  sort_order: number;
};

type Result = {
  id: string;
  team: string;
  opponent: string;
  result_date: string;
  score: string;
  summary: string;
  is_published: boolean;
  sort_order: number;
};

type Athlete = {
  id: string;
  name: string;
  team: string;
  sport: string;
};

type Team = {
  id: string;
  name: string;
  sport: string;
};

type AttendanceRecord = {
  athlete_id: string;
  session_date: string;
  status: string;
};

type PerformanceRecord = {
  athlete_id: string;
  test_date: string;
};

type AthleteLeaderboardRow = {
  athleteId: string;
  athleteName: string;
  team: string;
  score: number;
  attendanceRate: number;
  performanceLogs: number;
};

type TeamLeaderboardRow = {
  team: string;
  sport: string;
  score: number;
  avgAttendanceRate: number;
  performanceCount: number;
};

const LOW_ATTENDANCE_THRESHOLD = 70;
const STALE_PERFORMANCE_DAYS = 30;

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

function daysSince(dateString?: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

function normalizeTeam(row: GenericRow): Team {
  return {
    id: firstValue(row.id, row.team_id, crypto.randomUUID()),
    name: firstString(row.name, row.team, row.team_name) || 'Unnamed Team',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
  };
}

function normalizeAttendance(row: GenericRow): AttendanceRecord {
  return {
    athlete_id: firstValue(row.athlete_id),
    session_date: firstString(row.session_date),
    status: firstString(row.status),
  };
}

function normalizePerformance(row: GenericRow): PerformanceRecord {
  return {
    athlete_id: firstValue(row.athlete_id),
    test_date: firstString(row.test_date),
  };
}

export default function PortalPage() {
  const [weekPlans, setWeekPlans] = useState<WeekPlan[]>([]);
  const [weekPlanItems, setWeekPlanItems] = useState<WeekPlanItem[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [athleteRows, setAthleteRows] = useState<GenericRow[]>([]);
  const [teamRows, setTeamRows] = useState<GenericRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<GenericRow[]>([]);
  const [performanceRows, setPerformanceRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadPortal() {
    setLoading(true);
    setError('');

    const [
      weekPlanRes,
      weekPlanItemsRes,
      fixturesRes,
      resultsRes,
      athletesRes,
      teamsRes,
      attendanceRes,
      performanceRes,
    ] = await Promise.all([
      supabase.from('PortalWeekPlan').select('*').eq('published', true).order('created_at', { ascending: false }),
      supabase.from('PortalWeekPlanItems').select('*').order('sort_order', { ascending: true }),
      supabase.from('PortalFixtures').select('*').eq('is_published', true).order('fixture_date', { ascending: true }).order('sort_order', { ascending: true }),
      supabase.from('PortalResults').select('*').eq('is_published', true).order('result_date', { ascending: false }).order('sort_order', { ascending: true }),
      supabase.from('athletes').select('*'),
      supabase.from('Teams').select('*'),
      supabase.from('Attendance').select('*'),
      supabase.from('Performance').select('*'),
    ]);

    if (
      weekPlanRes.error ||
      weekPlanItemsRes.error ||
      fixturesRes.error ||
      resultsRes.error ||
      athletesRes.error ||
      teamsRes.error ||
      attendanceRes.error ||
      performanceRes.error
    ) {
      setError(
        weekPlanRes.error?.message ||
          weekPlanItemsRes.error?.message ||
          fixturesRes.error?.message ||
          resultsRes.error?.message ||
          athletesRes.error?.message ||
          teamsRes.error?.message ||
          attendanceRes.error?.message ||
          performanceRes.error?.message ||
          'Failed to load portal data.'
      );
      setLoading(false);
      return;
    }

    setWeekPlans((weekPlanRes.data as WeekPlan[]) || []);
    setWeekPlanItems((weekPlanItemsRes.data as WeekPlanItem[]) || []);
    setFixtures((fixturesRes.data as Fixture[]) || []);
    setResults((resultsRes.data as Result[]) || []);
    setAthleteRows((athletesRes.data as GenericRow[]) || []);
    setTeamRows((teamsRes.data as GenericRow[]) || []);
    setAttendanceRows((attendanceRes.data as GenericRow[]) || []);
    setPerformanceRows((performanceRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPortal();
  }, []);

  const athletes = useMemo(() => athleteRows.map(normalizeAthlete), [athleteRows]);
  const teams = useMemo(() => teamRows.map(normalizeTeam), [teamRows]);
  const attendance = useMemo(() => attendanceRows.map(normalizeAttendance), [attendanceRows]);
  const performance = useMemo(() => performanceRows.map(normalizePerformance), [performanceRows]);

  const athleteMap = useMemo(() => {
    const map = new Map<string, Athlete>();
    athletes.forEach((athlete) => map.set(athlete.id, athlete));
    return map;
  }, [athletes]);

  const latestWeekPlan = useMemo(() => {
    return weekPlans.length > 0 ? weekPlans[0] : null;
  }, [weekPlans]);

  const latestWeekPlanItems = useMemo(() => {
    if (!latestWeekPlan) return [];
    return weekPlanItems
      .filter((item) => item.week_plan_id === latestWeekPlan.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [latestWeekPlan, weekPlanItems]);

  const overallTopAthletes = useMemo(() => {
    const attendanceSummary = new Map<
      string,
      { total: number; positive: number; lastDate: string | null }
    >();

    attendance.forEach((entry) => {
      const current = attendanceSummary.get(entry.athlete_id) || {
        total: 0,
        positive: 0,
        lastDate: null,
      };

      current.total += 1;
      if (entry.status.toLowerCase() === 'present' || entry.status.toLowerCase() === 'late') {
        current.positive += 1;
      }

      const currentLast = current.lastDate ? new Date(current.lastDate).getTime() : 0;
      const entryTime = entry.session_date ? new Date(entry.session_date).getTime() : 0;
      if (entryTime > currentLast) current.lastDate = entry.session_date;

      attendanceSummary.set(entry.athlete_id, current);
    });

    const performanceSummary = new Map<
      string,
      { totalTests: number; lastTestDate: string | null }
    >();

    performance.forEach((entry) => {
      const current = performanceSummary.get(entry.athlete_id) || {
        totalTests: 0,
        lastTestDate: null,
      };

      current.totalTests += 1;

      const currentLast = current.lastTestDate ? new Date(current.lastTestDate).getTime() : 0;
      const entryTime = entry.test_date ? new Date(entry.test_date).getTime() : 0;
      if (entryTime > currentLast) current.lastTestDate = entry.test_date;

      performanceSummary.set(entry.athlete_id, current);
    });

    const rows: AthleteLeaderboardRow[] = athletes
      .map((athlete) => {
        const att = attendanceSummary.get(athlete.id);
        const perf = performanceSummary.get(athlete.id);

        const attendanceRate =
          att && att.total > 0 ? Math.round((att.positive / att.total) * 100) : 0;
        const attendanceLogs = att?.total ?? 0;
        const performanceLogs = perf?.totalTests ?? 0;
        const daysSinceTestValue = daysSince(perf?.lastTestDate ?? null);

        const attendanceScore = attendanceRate * 0.5;
        const attendanceVolumeScore = Math.min(attendanceLogs * 2, 20);
        const performanceVolumeScore = Math.min(performanceLogs * 3, 20);

        let testingRecencyScore = 0;
        if (daysSinceTestValue === null) testingRecencyScore = 0;
        else if (daysSinceTestValue <= 7) testingRecencyScore = 10;
        else if (daysSinceTestValue <= 14) testingRecencyScore = 8;
        else if (daysSinceTestValue <= 30) testingRecencyScore = 5;
        else testingRecencyScore = 1;

        const score = Math.round(
          attendanceScore + attendanceVolumeScore + performanceVolumeScore + testingRecencyScore
        );

        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          team: athlete.team,
          score,
          attendanceRate,
          performanceLogs,
        };
      })
      .sort((a, b) => b.score - a.score || b.attendanceRate - a.attendanceRate || b.performanceLogs - a.performanceLogs)
      .slice(0, 3);

    return rows;
  }, [athletes, attendance, performance]);

  const overallTopTeams = useMemo(() => {
    const teamNames = new Set<string>([
      ...teams.map((team) => team.name),
      ...athletes.map((athlete) => athlete.team),
    ]);

    const rows: TeamLeaderboardRow[] = Array.from(teamNames)
      .filter(Boolean)
      .map((teamName) => {
        const roster = athletes.filter((athlete) => athlete.team === teamName);
        const rosterIds = new Set(roster.map((athlete) => athlete.id));
        const teamAttendance = attendance.filter((entry) => rosterIds.has(entry.athlete_id));
        const teamPerformance = performance.filter((entry) => rosterIds.has(entry.athlete_id));
        const teamMeta = teams.find((team) => team.name === teamName);

        const attendanceByAthlete = new Map<
          string,
          { total: number; positive: number; lastDate: string | null }
        >();

        teamAttendance.forEach((entry) => {
          const current = attendanceByAthlete.get(entry.athlete_id) || {
            total: 0,
            positive: 0,
            lastDate: null,
          };

          current.total += 1;
          if (entry.status.toLowerCase() === 'present' || entry.status.toLowerCase() === 'late') {
            current.positive += 1;
          }

          const currentLast = current.lastDate ? new Date(current.lastDate).getTime() : 0;
          const entryTime = entry.session_date ? new Date(entry.session_date).getTime() : 0;
          if (entryTime > currentLast) current.lastDate = entry.session_date;

          attendanceByAthlete.set(entry.athlete_id, current);
        });

        const performanceByAthlete = new Map<string, string | null>();
        teamPerformance.forEach((entry) => {
          const currentLast = performanceByAthlete.get(entry.athlete_id);
          const currentTime = currentLast ? new Date(currentLast).getTime() : 0;
          const entryTime = entry.test_date ? new Date(entry.test_date).getTime() : 0;
          if (entryTime > currentTime) performanceByAthlete.set(entry.athlete_id, entry.test_date);
        });

        const athleteRates = roster.map((athlete) => {
          const entry = attendanceByAthlete.get(athlete.id);
          if (!entry || entry.total === 0) return 0;
          return Math.round((entry.positive / entry.total) * 100);
        });

        const avgAttendanceRate =
          athleteRates.length > 0
            ? Math.round(athleteRates.reduce((sum, value) => sum + value, 0) / athleteRates.length)
            : 0;

        const lowAttendanceAthletes = roster.filter((athlete) => {
          const entry = attendanceByAthlete.get(athlete.id);
          if (!entry || entry.total < 3) return false;
          const rate = Math.round((entry.positive / entry.total) * 100);
          return rate < LOW_ATTENDANCE_THRESHOLD;
        }).length;

        const staleTestingAthletes = roster.filter((athlete) => {
          const lastTestDate = performanceByAthlete.get(athlete.id);
          if (!lastTestDate) return true;
          const staleDays = daysSince(lastTestDate);
          return staleDays !== null && staleDays > STALE_PERFORMANCE_DAYS;
        }).length;

        const attendanceComponent = avgAttendanceRate * 0.6;
        const rosterComponent = Math.min(roster.length * 2, 20);
        const performanceComponent = Math.min(teamPerformance.length, 25);
        const penalty = lowAttendanceAthletes * 5 + staleTestingAthletes * 4;

        const score = Math.round(
          clamp(attendanceComponent + rosterComponent + performanceComponent - penalty, 0, 100)
        );

        return {
          team: teamName,
          sport: teamMeta?.sport || roster[0]?.sport || '—',
          score,
          avgAttendanceRate,
          performanceCount: teamPerformance.length,
        };
      })
      .sort((a, b) => b.score - a.score || b.avgAttendanceRate - a.avgAttendanceRate || b.performanceCount - a.performanceCount)
      .slice(0, 3);

    return rows;
  }, [teams, athletes, attendance, performance]);

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
            Weekly plans, fixtures, results, and public performance snapshots.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800 hover:text-white"
            >
              Coach System
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
                <h2 className="text-lg font-semibold">Week Overview</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {latestWeekPlan?.week_label || 'Current published week plan'}
                </p>
              </div>

              {latestWeekPlanItems.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                  No week plan published yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {latestWeekPlanItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                    >
                      <p className="text-xs uppercase tracking-wide text-emerald-400">
                        {item.day_label}
                      </p>
                      <h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {item.details || 'No extra details provided.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Upcoming Fixtures</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Published match schedule for players and parents.
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
                  <h2 className="text-lg font-semibold">Recent Results</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Published recent match outcomes.
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
                        className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {result.team} vs {result.opponent}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatDate(result.result_date)} • {result.summary || 'Final result'}
                          </p>
                        </div>

                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                          {result.score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Top 3 Athletes</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Public leaderboard based on attendance and performance system health.
                  </p>
                </div>

                {overallTopAthletes.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No athlete leaderboard data yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overallTopAthletes.map((athlete, index) => (
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
                              {athlete.attendanceRate}% attendance
                            </span>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              {athlete.performanceLogs} tests
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
                  <h2 className="text-lg font-semibold">Top 3 Teams</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Public leaderboard based on attendance quality and team performance coverage.
                  </p>
                </div>

                {overallTopTeams.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No team leaderboard data yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overallTopTeams.map((team, index) => (
                      <div
                        key={team.team}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              #{index + 1} {team.team}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">{team.sport}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-200">
                              Score {team.score}
                            </span>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              {team.avgAttendanceRate}% attendance
                            </span>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              {team.performanceCount} logs
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