'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type Athlete = {
  id: string;
  name: string;
  team: string;
  sport: string;
  ageGroup: string;
  raw: GenericRow;
};

type Team = {
  id: string;
  name: string;
  sport: string;
  season: string;
  raw: GenericRow;
};

type AttendanceRecord = {
  id: string;
  athlete_id: string;
  session_date: string;
  session_type: string;
  status: string;
  created_at: string | null;
  raw: GenericRow;
};

type PerformanceRecord = {
  id: string;
  athlete_id: string;
  test_date: string;
  test_type: string;
  result: number | null;
  unit: string;
  notes: string;
  created_at: string | null;
  raw: GenericRow;
};

type AttendanceSummary = {
  athleteId: string;
  athleteName: string;
  team: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  rate: number;
  lastDate: string | null;
};

type PerformanceSummary = {
  athleteId: string;
  athleteName: string;
  team: string;
  totalTests: number;
  lastTestDate: string | null;
};

type TeamHealth = {
  team: string;
  sport: string;
  rosterCount: number;
  attendanceCount: number;
  performanceCount: number;
  avgAttendanceRate: number;
  lowAttendanceAthletes: number;
  staleTestingAthletes: number;
};

type AthleteLeaderboardRow = {
  athleteId: string;
  athleteName: string;
  team: string;
  attendanceRate: number;
  attendanceLogs: number;
  performanceLogs: number;
  daysSinceTest: number | null;
  score: number;
};

type TeamLeaderboardRow = {
  team: string;
  sport: string;
  rosterCount: number;
  avgAttendanceRate: number;
  performanceCount: number;
  lowAttendanceAthletes: number;
  staleTestingAthletes: number;
  score: number;
};

const LOW_ATTENDANCE_THRESHOLD = 70;
const STALE_PERFORMANCE_DAYS = 30;
const STALE_ATTENDANCE_DAYS = 14;

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

function firstNumber(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  return null;
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
    ageGroup: firstString(row.age_group, row.agegroup, row.grade_group, row.group) || '—',
    raw: row,
  };
}

function normalizeTeam(row: GenericRow): Team {
  return {
    id: firstValue(row.id, row.team_id, crypto.randomUUID()),
    name: firstString(row.name, row.team, row.team_name) || 'Unnamed Team',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
    season: firstString(row.season, row.year, row.phase) || '—',
    raw: row,
  };
}

function normalizeAttendance(row: GenericRow): AttendanceRecord {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    athlete_id: firstValue(row.athlete_id),
    session_date: firstString(row.session_date),
    session_type: firstString(row.session_type) || '—',
    status: firstString(row.status) || '—',
    created_at: firstString(row.created_at) || null,
    raw: row,
  };
}

function normalizePerformance(row: GenericRow): PerformanceRecord {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    athlete_id: firstValue(row.athlete_id),
    test_date: firstString(row.test_date),
    test_type: firstString(row.test_type) || '—',
    result: firstNumber(row.result),
    unit: firstString(row.unit) || '',
    notes: firstString(row.notes) || '',
    created_at: firstString(row.created_at) || null,
    raw: row,
  };
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
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function DashboardPage() {
  const [athleteRows, setAthleteRows] = useState<GenericRow[]>([]);
  const [teamRows, setTeamRows] = useState<GenericRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<GenericRow[]>([]);
  const [performanceRows, setPerformanceRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    const [athletesRes, teamsRes, attendanceRes, performanceRes] = await Promise.all([
      supabase.from('athletes').select('*'),
      supabase.from('Teams').select('*'),
      supabase.from('Attendance').select('*').order('session_date', { ascending: false }),
      supabase.from('Performance').select('*').order('test_date', { ascending: false }),
    ]);

    if (athletesRes.error || teamsRes.error || attendanceRes.error || performanceRes.error) {
      setError(
        athletesRes.error?.message ||
          teamsRes.error?.message ||
          attendanceRes.error?.message ||
          performanceRes.error?.message ||
          'Failed to load dashboard data.'
      );
      setAthleteRows([]);
      setTeamRows([]);
      setAttendanceRows([]);
      setPerformanceRows([]);
      setLoading(false);
      return;
    }

    setAthleteRows((athletesRes.data as GenericRow[]) || []);
    setTeamRows((teamsRes.data as GenericRow[]) || []);
    setAttendanceRows((attendanceRes.data as GenericRow[]) || []);
    setPerformanceRows((performanceRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const athletes = useMemo(() => {
    return athleteRows.map(normalizeAthlete).sort((a, b) => a.name.localeCompare(b.name));
  }, [athleteRows]);

  const teams = useMemo(() => {
    return teamRows.map(normalizeTeam).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamRows]);

  const attendance = useMemo(() => {
    return attendanceRows
      .map(normalizeAttendance)
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }, [attendanceRows]);

  const performance = useMemo(() => {
    return performanceRows
      .map(normalizePerformance)
      .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
  }, [performanceRows]);

  const athleteMap = useMemo(() => {
    const map = new Map<string, Athlete>();
    athletes.forEach((athlete) => map.set(athlete.id, athlete));
    return map;
  }, [athletes]);

  const attendanceSummary = useMemo(() => {
    const grouped = new Map<string, AttendanceSummary>();

    attendance.forEach((entry) => {
      const athlete = athleteMap.get(entry.athlete_id);
      const athleteId = entry.athlete_id;
      const athleteName = athlete?.name || 'Unknown Athlete';
      const team = athlete?.team || 'Unassigned';

      if (!grouped.has(athleteId)) {
        grouped.set(athleteId, {
          athleteId,
          athleteName,
          team,
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
          rate: 0,
          lastDate: entry.session_date || null,
        });
      }

      const current = grouped.get(athleteId)!;
      current.total += 1;

      const status = entry.status.toLowerCase();
      if (status === 'present') current.present += 1;
      else if (status === 'late') current.late += 1;
      else if (status === 'absent') current.absent += 1;
      else if (status === 'excused') current.excused += 1;

      const currentLast = current.lastDate ? new Date(current.lastDate).getTime() : 0;
      const entryTime = entry.session_date ? new Date(entry.session_date).getTime() : 0;
      if (entryTime > currentLast) current.lastDate = entry.session_date;
    });

    return Array.from(grouped.values())
      .map((item) => {
        const positive = item.present + item.late;
        return {
          ...item,
          rate: item.total > 0 ? Math.round((positive / item.total) * 100) : 0,
        };
      })
      .sort((a, b) => a.athleteName.localeCompare(b.athleteName));
  }, [attendance, athleteMap]);

  const performanceSummary = useMemo(() => {
    const grouped = new Map<string, PerformanceSummary>();

    performance.forEach((entry) => {
      const athlete = athleteMap.get(entry.athlete_id);
      const athleteId = entry.athlete_id;
      const athleteName = athlete?.name || 'Unknown Athlete';
      const team = athlete?.team || 'Unassigned';

      if (!grouped.has(athleteId)) {
        grouped.set(athleteId, {
          athleteId,
          athleteName,
          team,
          totalTests: 0,
          lastTestDate: entry.test_date || null,
        });
      }

      const current = grouped.get(athleteId)!;
      current.totalTests += 1;

      const currentLast = current.lastTestDate ? new Date(current.lastTestDate).getTime() : 0;
      const entryTime = entry.test_date ? new Date(entry.test_date).getTime() : 0;
      if (entryTime > currentLast) current.lastTestDate = entry.test_date;
    });

    return Array.from(grouped.values()).sort((a, b) => a.athleteName.localeCompare(b.athleteName));
  }, [performance, athleteMap]);

  const lowAttendanceAthletes = useMemo(() => {
    return attendanceSummary
      .filter((item) => item.total >= 3 && item.rate < LOW_ATTENDANCE_THRESHOLD)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 8);
  }, [attendanceSummary]);

  const stalePerformanceAthletes = useMemo(() => {
    const perfMap = new Map<string, PerformanceSummary>();
    performanceSummary.forEach((item) => perfMap.set(item.athleteId, item));

    return athletes
      .map((athlete) => {
        const perf = perfMap.get(athlete.id);
        const staleDays = daysSince(perf?.lastTestDate || null);

        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          team: athlete.team,
          lastTestDate: perf?.lastTestDate || null,
          staleDays,
          hasNoTests: !perf,
        };
      })
      .filter((item) => item.hasNoTests || (item.staleDays !== null && item.staleDays > STALE_PERFORMANCE_DAYS))
      .sort((a, b) => {
        if (a.hasNoTests && !b.hasNoTests) return -1;
        if (!a.hasNoTests && b.hasNoTests) return 1;
        return (b.staleDays ?? 0) - (a.staleDays ?? 0);
      })
      .slice(0, 8);
  }, [athletes, performanceSummary]);

  const staleAttendanceAthletes = useMemo(() => {
    const attMap = new Map<string, AttendanceSummary>();
    attendanceSummary.forEach((item) => attMap.set(item.athleteId, item));

    return athletes
      .map((athlete) => {
        const att = attMap.get(athlete.id);
        const staleDays = daysSince(att?.lastDate || null);

        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          team: athlete.team,
          lastAttendanceDate: att?.lastDate || null,
          staleDays,
          hasNoAttendance: !att,
        };
      })
      .filter((item) => item.hasNoAttendance || (item.staleDays !== null && item.staleDays > STALE_ATTENDANCE_DAYS))
      .sort((a, b) => {
        if (a.hasNoAttendance && !b.hasNoAttendance) return -1;
        if (!a.hasNoAttendance && b.hasNoAttendance) return 1;
        return (b.staleDays ?? 0) - (a.staleDays ?? 0);
      })
      .slice(0, 8);
  }, [athletes, attendanceSummary]);

  const teamHealth = useMemo(() => {
    const attendanceByAthlete = new Map<string, AttendanceSummary>();
    attendanceSummary.forEach((item) => attendanceByAthlete.set(item.athleteId, item));

    const performanceByAthlete = new Map<string, PerformanceSummary>();
    performanceSummary.forEach((item) => performanceByAthlete.set(item.athleteId, item));

    const teamNames = new Set<string>([
      ...teams.map((team) => team.name),
      ...athletes.map((athlete) => athlete.team),
    ]);

    const rows: TeamHealth[] = Array.from(teamNames)
      .filter(Boolean)
      .map((teamName) => {
        const roster = athletes.filter((athlete) => athlete.team === teamName);
        const rosterIds = new Set(roster.map((athlete) => athlete.id));
        const teamAttendance = attendance.filter((entry) => rosterIds.has(entry.athlete_id));
        const teamPerformance = performance.filter((entry) => rosterIds.has(entry.athlete_id));
        const teamMeta = teams.find((team) => team.name === teamName);

        const attendanceRates = roster
          .map((athlete) => attendanceByAthlete.get(athlete.id))
          .filter(Boolean) as AttendanceSummary[];

        const avgAttendanceRate =
          attendanceRates.length > 0
            ? Math.round(attendanceRates.reduce((sum, item) => sum + item.rate, 0) / attendanceRates.length)
            : 0;

        const lowAttendanceCount = roster.filter((athlete) => {
          const item = attendanceByAthlete.get(athlete.id);
          return item && item.total >= 3 && item.rate < LOW_ATTENDANCE_THRESHOLD;
        }).length;

        const staleTestingCount = roster.filter((athlete) => {
          const item = performanceByAthlete.get(athlete.id);
          if (!item) return true;
          const staleDays = daysSince(item.lastTestDate);
          return staleDays !== null && staleDays > STALE_PERFORMANCE_DAYS;
        }).length;

        return {
          team: teamName,
          sport: teamMeta?.sport || roster[0]?.sport || '—',
          rosterCount: roster.length,
          attendanceCount: teamAttendance.length,
          performanceCount: teamPerformance.length,
          avgAttendanceRate,
          lowAttendanceAthletes: lowAttendanceCount,
          staleTestingAthletes: staleTestingCount,
        };
      })
      .sort((a, b) => a.team.localeCompare(b.team));

    return rows;
  }, [teams, athletes, attendance, performance, attendanceSummary, performanceSummary]);

  const overallTopAthletes = useMemo(() => {
    const attendanceMap = new Map<string, AttendanceSummary>();
    attendanceSummary.forEach((item) => attendanceMap.set(item.athleteId, item));

    const performanceMap = new Map<string, PerformanceSummary>();
    performanceSummary.forEach((item) => performanceMap.set(item.athleteId, item));

    const rows: AthleteLeaderboardRow[] = athletes
      .map((athlete) => {
        const att = attendanceMap.get(athlete.id);
        const perf = performanceMap.get(athlete.id);

        const attendanceRate = att?.rate ?? 0;
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

        const score = Math.round(attendanceScore + attendanceVolumeScore + performanceVolumeScore + testingRecencyScore);

        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          team: athlete.team,
          attendanceRate,
          attendanceLogs,
          performanceLogs,
          daysSinceTest: daysSinceTestValue,
          score,
        };
      })
      .sort((a, b) => b.score - a.score || b.attendanceRate - a.attendanceRate || b.performanceLogs - a.performanceLogs);

    return rows.slice(0, 3);
  }, [athletes, attendanceSummary, performanceSummary]);

  const overallTopTeams = useMemo(() => {
    const rows: TeamLeaderboardRow[] = teamHealth
      .map((team) => {
        const attendanceComponent = team.avgAttendanceRate * 0.6;
        const rosterComponent = Math.min(team.rosterCount * 2, 20);
        const performanceComponent = Math.min(team.performanceCount, 25);
        const penalty =
          team.lowAttendanceAthletes * 5 +
          team.staleTestingAthletes * 4;

        const score = Math.round(clamp(attendanceComponent + rosterComponent + performanceComponent - penalty, 0, 100));

        return {
          team: team.team,
          sport: team.sport,
          rosterCount: team.rosterCount,
          avgAttendanceRate: team.avgAttendanceRate,
          performanceCount: team.performanceCount,
          lowAttendanceAthletes: team.lowAttendanceAthletes,
          staleTestingAthletes: team.staleTestingAthletes,
          score,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.avgAttendanceRate - a.avgAttendanceRate ||
          b.performanceCount - a.performanceCount
      );

    return rows.slice(0, 3);
  }, [teamHealth]);

  const recentActivity = useMemo(() => {
    const recentAttendance = attendance.slice(0, 5).map((entry) => {
      const athlete = athleteMap.get(entry.athlete_id);
      return {
        type: 'Attendance',
        title: `${athlete?.name || 'Unknown Athlete'} • ${entry.status}`,
        subtitle: `${athlete?.team || 'Unassigned'} • ${entry.session_type}`,
        date: entry.session_date,
        href: '/attendance',
      };
    });

    const recentPerformance = performance.slice(0, 5).map((entry) => {
      const athlete = athleteMap.get(entry.athlete_id);
      return {
        type: 'Performance',
        title: `${athlete?.name || 'Unknown Athlete'} • ${entry.test_type}`,
        subtitle: `${athlete?.team || 'Unassigned'} • ${
          entry.result === null ? '—' : `${entry.result}${entry.unit ? ` ${entry.unit}` : ''}`
        }`,
        date: entry.test_date,
        href: '/performance',
      };
    });

    return [...recentAttendance, ...recentPerformance]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [attendance, performance, athleteMap]);

  const headlineStats = useMemo(() => {
    const totalAthletes = athletes.length;
    const totalTeams = teams.length || new Set(athletes.map((athlete) => athlete.team).filter(Boolean)).size;
    const totalAttendance = attendance.length;
    const totalPerformance = performance.length;

    const positiveAttendance = attendance.filter((entry) => {
      const status = entry.status.toLowerCase();
      return status === 'present' || status === 'late';
    }).length;

    const attendanceRate = totalAttendance > 0 ? Math.round((positiveAttendance / totalAttendance) * 100) : 0;

    const athletesWithTests = new Set(performance.map((entry) => entry.athlete_id)).size;

    return {
      totalAthletes,
      totalTeams,
      totalAttendance,
      totalPerformance,
      attendanceRate,
      athletesWithTests,
      athletesWithoutTests: Math.max(totalAthletes - athletesWithTests, 0),
      urgentIssues: lowAttendanceAthletes.length + stalePerformanceAthletes.length + staleAttendanceAthletes.length,
    };
  }, [athletes, teams, attendance, performance, lowAttendanceAthletes, stalePerformanceAthletes, staleAttendanceAthletes]);

  const urgentAlerts = useMemo(() => {
    const alerts: { level: 'high' | 'medium'; title: string; detail: string; href: string }[] = [];

    if (lowAttendanceAthletes.length > 0) {
      alerts.push({
        level: 'high',
        title: `${lowAttendanceAthletes.length} athlete${lowAttendanceAthletes.length === 1 ? '' : 's'} below ${LOW_ATTENDANCE_THRESHOLD}% attendance`,
        detail: 'These athletes are consistently missing sessions or arriving late.',
        href: '/attendance',
      });
    }

    if (stalePerformanceAthletes.length > 0) {
      alerts.push({
        level: 'medium',
        title: `${stalePerformanceAthletes.length} athlete${stalePerformanceAthletes.length === 1 ? '' : 's'} need updated testing`,
        detail: `No recent performance data in the last ${STALE_PERFORMANCE_DAYS} days or no tests recorded.`,
        href: '/performance',
      });
    }

    if (staleAttendanceAthletes.length > 0) {
      alerts.push({
        level: 'medium',
        title: `${staleAttendanceAthletes.length} athlete${staleAttendanceAthletes.length === 1 ? '' : 's'} have stale attendance logs`,
        detail: `No attendance activity in the last ${STALE_ATTENDANCE_DAYS} days or no attendance logged yet.`,
        href: '/attendance',
      });
    }

    const emptyTeams = teamHealth.filter((team) => team.rosterCount === 0);
    if (emptyTeams.length > 0) {
      alerts.push({
        level: 'medium',
        title: `${emptyTeams.length} team${emptyTeams.length === 1 ? '' : 's'} have no roster`,
        detail: 'These teams exist but currently have no assigned athletes.',
        href: '/teams',
      });
    }

    return alerts.slice(0, 4);
  }, [lowAttendanceAthletes, stalePerformanceAthletes, staleAttendanceAthletes, teamHealth]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-300">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              High-Performance Operations
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Coach Operations Board</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              This dashboard shows where coach attention is needed right now: attendance risk, stale testing,
              team health, recent activity, and overall leaderboard performance.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <Link
              href="/athletes"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Manage Athletes
            </Link>
            <Link
              href="/teams"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Open Teams
            </Link>
            <Link
              href="/attendance"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Log Attendance
            </Link>
            <Link
              href="/performance"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Log Performance
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Athletes</p>
            <p className="mt-3 text-3xl font-bold">{headlineStats.totalAthletes}</p>
            <p className="mt-2 text-sm text-slate-300">Across all athlete records in the system.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Teams</p>
            <p className="mt-3 text-3xl font-bold">{headlineStats.totalTeams}</p>
            <p className="mt-2 text-sm text-slate-300">Team environments currently being managed.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Attendance Rate</p>
            <p className="mt-3 text-3xl font-bold">{headlineStats.attendanceRate}%</p>
            <p className="mt-2 text-sm text-slate-300">Present + late as a percentage of all attendance logs.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Urgent Issues</p>
            <p className="mt-3 text-3xl font-bold">{headlineStats.urgentIssues}</p>
            <p className="mt-2 text-sm text-slate-300">Flags requiring coach follow-up.</p>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Overall Top 3 Athletes</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Ranked by attendance quality, data volume, and testing recency.
                </p>
              </div>
              <Link href="/athletes" className="text-sm font-medium text-sky-400 hover:text-sky-300">
                Open Athletes
              </Link>
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

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Overall Top 3 Teams</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Ranked by attendance quality, roster health, and performance coverage.
                </p>
              </div>
              <Link href="/teams" className="text-sm font-medium text-sky-400 hover:text-sky-300">
                Open Teams
              </Link>
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
                        <p className="mt-1 text-sm text-slate-400">
                          {team.sport} • {team.rosterCount} athletes
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-200">
                          Score {team.score}
                        </span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {team.avgAttendanceRate}% attendance
                        </span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {team.performanceCount} performance logs
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Priority Alerts</h2>
              <p className="mt-1 text-sm text-slate-400">Immediate operational issues detected by the system.</p>
            </div>

            {urgentAlerts.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                No urgent dashboard alerts right now. Data coverage looks healthy.
              </div>
            ) : (
              <div className="space-y-3">
                {urgentAlerts.map((alert, index) => (
                  <Link
                    key={`${alert.title}-${index}`}
                    href={alert.href}
                    className={`block rounded-xl border p-4 transition hover:bg-slate-800 ${
                      alert.level === 'high'
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{alert.title}</p>
                        <p className="mt-1 text-sm text-slate-300">{alert.detail}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          alert.level === 'high'
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {alert.level === 'high' ? 'High' : 'Watch'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Data Coverage</h2>
            <p className="mt-1 text-sm text-slate-400">A quick view of how complete the system is.</p>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Attendance Records</p>
                <p className="mt-2 text-2xl font-bold">{headlineStats.totalAttendance}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Performance Records</p>
                <p className="mt-2 text-2xl font-bold">{headlineStats.totalPerformance}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Athletes With Tests</p>
                <p className="mt-2 text-2xl font-bold">{headlineStats.athletesWithTests}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {headlineStats.athletesWithoutTests} athlete{headlineStats.athletesWithoutTests === 1 ? '' : 's'} still need baseline or updated testing.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Low Attendance Watchlist</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Athletes below {LOW_ATTENDANCE_THRESHOLD}% once they have at least 3 logged sessions.
                </p>
              </div>
              <Link href="/attendance" className="text-sm font-medium text-sky-400 hover:text-sky-300">
                Open Attendance
              </Link>
            </div>

            {lowAttendanceAthletes.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No low-attendance athletes detected from the current data.
              </div>
            ) : (
              <div className="space-y-3">
                {lowAttendanceAthletes.map((athlete) => (
                  <div
                    key={athlete.athleteId}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link
                          href={`/athletes/${athlete.athleteId}`}
                          className="text-sm font-semibold text-white hover:text-sky-400"
                        >
                          {athlete.athleteName}
                        </Link>
                        <p className="mt-1 text-sm text-slate-400">{athlete.team}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                          {athlete.rate}% attendance
                        </span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {athlete.present} present
                        </span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {athlete.absent} absent
                        </span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {athlete.late} late
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Testing Follow-Up Watchlist</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Athletes with no tests or no recent testing in the last {STALE_PERFORMANCE_DAYS} days.
                </p>
              </div>
              <Link href="/performance" className="text-sm font-medium text-sky-400 hover:text-sky-300">
                Open Performance
              </Link>
            </div>

            {stalePerformanceAthletes.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                Everyone currently has recent enough performance data.
              </div>
            ) : (
              <div className="space-y-3">
                {stalePerformanceAthletes.map((athlete) => (
                  <div
                    key={athlete.athleteId}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link
                          href={`/athletes/${athlete.athleteId}`}
                          className="text-sm font-semibold text-white hover:text-sky-400"
                        >
                          {athlete.athleteName}
                        </Link>
                        <p className="mt-1 text-sm text-slate-400">{athlete.team}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {athlete.hasNoTests ? (
                          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-200">
                            No tests recorded
                          </span>
                        ) : (
                          <>
                            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                              {athlete.staleDays} days since last test
                            </span>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              Last: {formatDate(athlete.lastTestDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Attendance Logging Gaps</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Athletes with no attendance yet or no recent attendance logs.
                </p>
              </div>
              <Link href="/attendance" className="text-sm font-medium text-sky-400 hover:text-sky-300">
                Fix Attendance
              </Link>
            </div>

            {staleAttendanceAthletes.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                Attendance logging appears current.
              </div>
            ) : (
              <div className="space-y-3">
                {staleAttendanceAthletes.map((athlete) => (
                  <div
                    key={athlete.athleteId}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link
                          href={`/athletes/${athlete.athleteId}`}
                          className="text-sm font-semibold text-white hover:text-sky-400"
                        >
                          {athlete.athleteName}
                        </Link>
                        <p className="mt-1 text-sm text-slate-400">{athlete.team}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {athlete.hasNoAttendance ? (
                          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-200">
                            No attendance logged
                          </span>
                        ) : (
                          <>
                            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                              {athlete.staleDays} days since last attendance
                            </span>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              Last: {formatDate(athlete.lastAttendanceDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <p className="mt-1 text-sm text-slate-400">Latest attendance and performance activity across the system.</p>
            </div>

            {recentActivity.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No recent activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item, index) => (
                  <Link
                    key={`${item.type}-${item.title}-${index}`}
                    href={item.href}
                    className="block rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition hover:bg-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.subtitle}</p>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                          {item.type}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">{formatDate(item.date)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Team Health Snapshot</h2>
              <p className="mt-1 text-sm text-slate-400">
                Roster size, data volume, attendance quality, and testing follow-up needs.
              </p>
            </div>
            <Link href="/teams" className="text-sm font-medium text-sky-400 hover:text-sky-300">
              Open Teams
            </Link>
          </div>

          {teamHealth.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              No teams found yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-3 py-3 font-medium">Team</th>
                    <th className="px-3 py-3 font-medium">Sport</th>
                    <th className="px-3 py-3 font-medium">Roster</th>
                    <th className="px-3 py-3 font-medium">Attendance Logs</th>
                    <th className="px-3 py-3 font-medium">Performance Logs</th>
                    <th className="px-3 py-3 font-medium">Avg Attendance</th>
                    <th className="px-3 py-3 font-medium">Low Attendance</th>
                    <th className="px-3 py-3 font-medium">Testing Follow-Up</th>
                  </tr>
                </thead>
                <tbody>
                  {teamHealth.map((team) => (
                    <tr key={team.team} className="border-b border-slate-900">
                      <td className="px-3 py-3">
                        <Link
                          href={`/teams/${encodeURIComponent(team.team)}`}
                          className="font-medium text-white hover:text-sky-400"
                        >
                          {team.team}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{team.sport}</td>
                      <td className="px-3 py-3 text-slate-300">{team.rosterCount}</td>
                      <td className="px-3 py-3 text-slate-300">{team.attendanceCount}</td>
                      <td className="px-3 py-3 text-slate-300">{team.performanceCount}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                          {team.avgAttendanceRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            team.lowAttendanceAthletes > 0
                              ? 'bg-amber-500/15 text-amber-200'
                              : 'bg-emerald-500/15 text-emerald-200'
                          }`}
                        >
                          {team.lowAttendanceAthletes}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            team.staleTestingAthletes > 0
                              ? 'bg-amber-500/15 text-amber-200'
                              : 'bg-emerald-500/15 text-emerald-200'
                          }`}
                        >
                          {team.staleTestingAthletes}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}