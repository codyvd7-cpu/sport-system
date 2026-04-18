'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type Athlete = {
  id: number | string;
  name: string;
  team: string;
  sport: string;
  age_group: string;
};

type Team = {
  id?: number | string;
  name: string;
  sport: string;
  season: string;
};

type AttendanceRecord = {
  id: number | string;
  athlete_id: number | string | null;
  athlete_name: string | null;
  team: string | null;
  session_type: string | null;
  status: string | null;
  date: string | null;
  created_at?: string | null;
};

type PerformanceRecord = {
  id: number | string;
  athlete_id: number | string | null;
  athlete_name: string | null;
  team: string | null;
  test_name: string | null;
  value: number | string | null;
  unit: string | null;
  date: string | null;
  created_at?: string | null;
};

type AthleteAttendanceSummary = {
  athleteId: number | string;
  athleteName: string;
  team: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
  lastDate: string | null;
};

type AthletePerformanceSummary = {
  athleteId: number | string;
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
  staleAthletes: number;
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

function firstNumberOrString(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return '';
}

function normalizeAthlete(row: GenericRow): Athlete {
  return {
    id: firstNumberOrString(row.id, row.athlete_id, crypto.randomUUID()),
    name: firstString(
      row.name,
      row.full_name,
      row.athlete_name,
      row.player_name,
      row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : '',
      row.first_name
    ) || 'Unknown Athlete',
    team: firstString(row.team, row.team_name, row.squad, row.group_name) || 'Unassigned',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
    age_group: firstString(row.age_group, row.agegroup, row.grade_group, row.group) || '—',
  };
}

function normalizeTeam(row: GenericRow): Team {
  return {
    id: firstNumberOrString(row.id, row.team_id, crypto.randomUUID()),
    name: firstString(row.name, row.team, row.team_name) || 'Unnamed Team',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
    season: firstString(row.season, row.year, row.phase) || '—',
  };
}

function normalizeAttendance(row: GenericRow): AttendanceRecord {
  return {
    id: firstNumberOrString(row.id, row.attendance_id, crypto.randomUUID()),
    athlete_id: firstNumberOrString(row.athlete_id, row.player_id, null) || null,
    athlete_name:
      firstString(
        row.athlete_name,
        row.name,
        row.full_name,
        row.player_name
      ) || null,
    team: firstString(row.team, row.team_name, row.squad) || null,
    session_type: firstString(row.session_type, row.session, row.type) || null,
    status: firstString(row.status, row.attendance_status) || null,
    date: firstString(row.date, row.session_date, row.created_at) || null,
    created_at: firstString(row.created_at) || null,
  };
}

function normalizePerformance(row: GenericRow): PerformanceRecord {
  return {
    id: firstNumberOrString(row.id, row.performance_id, crypto.randomUUID()),
    athlete_id: firstNumberOrString(row.athlete_id, row.player_id, null) || null,
    athlete_name:
      firstString(
        row.athlete_name,
        row.name,
        row.full_name,
        row.player_name
      ) || null,
    team: firstString(row.team, row.team_name, row.squad) || null,
    test_name: firstString(row.test_name, row.test, row.metric, row.exercise) || null,
    value: firstNumberOrString(row.value, row.score, row.result, null) ?? null,
    unit: firstString(row.unit, row.units) || null,
    date: firstString(row.date, row.test_date, row.created_at) || null,
    created_at: firstString(row.created_at) || null,
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

function slugifyTeamName(name: string) {
  return encodeURIComponent(name);
}

export default function DashboardPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      const [athletesRes, teamsRes, attendanceRes, performanceRes] = await Promise.all([
        supabase.from('athletes').select('*'),
        supabase.from('Teams').select('*'),
        supabase.from('Attendance').select('*'),
        supabase.from('Performance').select('*'),
      ]);

      if (athletesRes.error || teamsRes.error || attendanceRes.error || performanceRes.error) {
        setError(
          athletesRes.error?.message ||
            teamsRes.error?.message ||
            attendanceRes.error?.message ||
            performanceRes.error?.message ||
            'Failed to load dashboard data.'
        );
        setLoading(false);
        return;
      }

      const normalizedAthletes = ((athletesRes.data as GenericRow[]) || []).map(normalizeAthlete);
      const normalizedTeams = ((teamsRes.data as GenericRow[]) || []).map(normalizeTeam);
      const normalizedAttendance = ((attendanceRes.data as GenericRow[]) || [])
        .map(normalizeAttendance)
        .sort((a, b) => {
          const aTime = a.date ? new Date(a.date).getTime() : 0;
          const bTime = b.date ? new Date(b.date).getTime() : 0;
          return bTime - aTime;
        });

      const normalizedPerformance = ((performanceRes.data as GenericRow[]) || [])
        .map(normalizePerformance)
        .sort((a, b) => {
          const aTime = a.date ? new Date(a.date).getTime() : 0;
          const bTime = b.date ? new Date(b.date).getTime() : 0;
          return bTime - aTime;
        });

      setAthletes(normalizedAthletes);
      setTeams(normalizedTeams);
      setAttendance(normalizedAttendance);
      setPerformance(normalizedPerformance);
      setLoading(false);
    };

    loadDashboard();
  }, []);

  const athleteMap = useMemo(() => {
    const map = new Map<string, Athlete>();
    athletes.forEach((athlete) => {
      map.set(String(athlete.id), athlete);
    });
    return map;
  }, [athletes]);

  const attendanceSummary = useMemo(() => {
    const grouped = new Map<string, AthleteAttendanceSummary>();

    attendance.forEach((entry) => {
      const athleteId = entry.athlete_id ?? `name:${entry.athlete_name ?? 'unknown'}`;
      const key = String(athleteId);

      const linkedAthlete = entry.athlete_id ? athleteMap.get(String(entry.athlete_id)) : undefined;
      const athleteName = linkedAthlete?.name || entry.athlete_name || 'Unknown Athlete';
      const athleteTeam = linkedAthlete?.team || entry.team || 'Unassigned';

      if (!grouped.has(key)) {
        grouped.set(key, {
          athleteId,
          athleteName,
          team: athleteTeam,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          rate: 0,
          lastDate: entry.date ?? null,
        });
      }

      const current = grouped.get(key)!;
      current.total += 1;

      const status = (entry.status || '').toLowerCase();

      if (status === 'present') current.present += 1;
      else if (status === 'absent') current.absent += 1;
      else if (status === 'late') current.late += 1;
      else if (status === 'excused') current.excused += 1;

      const currentLastDate = current.lastDate ? new Date(current.lastDate).getTime() : 0;
      const entryDate = entry.date ? new Date(entry.date).getTime() : 0;

      if (entryDate > currentLastDate) {
        current.lastDate = entry.date ?? current.lastDate;
      }
    });

    return Array.from(grouped.values())
      .map((item) => {
        const positiveCount = item.present + item.late;
        const rate = item.total > 0 ? Math.round((positiveCount / item.total) * 100) : 0;

        return {
          ...item,
          rate,
        };
      })
      .sort((a, b) => a.athleteName.localeCompare(b.athleteName));
  }, [attendance, athleteMap]);

  const performanceSummary = useMemo(() => {
    const grouped = new Map<string, AthletePerformanceSummary>();

    performance.forEach((entry) => {
      const athleteId = entry.athlete_id ?? `name:${entry.athlete_name ?? 'unknown'}`;
      const key = String(athleteId);

      const linkedAthlete = entry.athlete_id ? athleteMap.get(String(entry.athlete_id)) : undefined;
      const athleteName = linkedAthlete?.name || entry.athlete_name || 'Unknown Athlete';
      const athleteTeam = linkedAthlete?.team || entry.team || 'Unassigned';

      if (!grouped.has(key)) {
        grouped.set(key, {
          athleteId,
          athleteName,
          team: athleteTeam,
          totalTests: 0,
          lastTestDate: entry.date ?? null,
        });
      }

      const current = grouped.get(key)!;
      current.totalTests += 1;

      const currentLastDate = current.lastTestDate ? new Date(current.lastTestDate).getTime() : 0;
      const entryDate = entry.date ? new Date(entry.date).getTime() : 0;

      if (entryDate > currentLastDate) {
        current.lastTestDate = entry.date ?? current.lastTestDate;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => a.athleteName.localeCompare(b.athleteName));
  }, [performance, athleteMap]);

  const lowAttendanceAthletes = useMemo(() => {
    return attendanceSummary
      .filter((athlete) => athlete.total >= 3 && athlete.rate < LOW_ATTENDANCE_THRESHOLD)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 8);
  }, [attendanceSummary]);

  const stalePerformanceAthletes = useMemo(() => {
    const perfMap = new Map<string, AthletePerformanceSummary>();
    performanceSummary.forEach((item) => {
      perfMap.set(String(item.athleteId), item);
    });

    return athletes
      .map((athlete) => {
        const perf = perfMap.get(String(athlete.id));
        const staleDays = daysSince(perf?.lastTestDate ?? null);

        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          team: athlete.team || 'Unassigned',
          lastTestDate: perf?.lastTestDate ?? null,
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
    const attMap = new Map<string, AthleteAttendanceSummary>();
    attendanceSummary.forEach((item) => {
      attMap.set(String(item.athleteId), item);
    });

    return athletes
      .map((athlete) => {
        const att = attMap.get(String(athlete.id));
        const staleDays = daysSince(att?.lastDate ?? null);

        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          team: athlete.team || 'Unassigned',
          lastAttendanceDate: att?.lastDate ?? null,
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
    const attendanceByTeam = new Map<string, AttendanceRecord[]>();
    const performanceByTeam = new Map<string, PerformanceRecord[]>();
    const rosterByTeam = new Map<string, Athlete[]>();
    const attendanceRateByAthleteId = new Map<string, AthleteAttendanceSummary>();
    const performanceByAthleteId = new Map<string, AthletePerformanceSummary>();

    attendanceSummary.forEach((item) => {
      attendanceRateByAthleteId.set(String(item.athleteId), item);
    });

    performanceSummary.forEach((item) => {
      performanceByAthleteId.set(String(item.athleteId), item);
    });

    attendance.forEach((item) => {
      const key = item.team || 'Unassigned';
      if (!attendanceByTeam.has(key)) attendanceByTeam.set(key, []);
      attendanceByTeam.get(key)!.push(item);
    });

    performance.forEach((item) => {
      const key = item.team || 'Unassigned';
      if (!performanceByTeam.has(key)) performanceByTeam.set(key, []);
      performanceByTeam.get(key)!.push(item);
    });

    athletes.forEach((athlete) => {
      const key = athlete.team || 'Unassigned';
      if (!rosterByTeam.has(key)) rosterByTeam.set(key, []);
      rosterByTeam.get(key)!.push(athlete);
    });

    const teamNames = new Set<string>([
      ...teams.map((t) => t.name),
      ...athletes.map((a) => a.team || 'Unassigned'),
      ...attendance.map((a) => a.team || 'Unassigned'),
      ...performance.map((p) => p.team || 'Unassigned'),
    ]);

    const results: TeamHealth[] = Array.from(teamNames)
      .filter(Boolean)
      .map((teamName) => {
        const roster = rosterByTeam.get(teamName) || [];
        const teamAttendance = attendanceByTeam.get(teamName) || [];
        const teamPerformance = performanceByTeam.get(teamName) || [];
        const teamMeta = teams.find((t) => t.name === teamName);

        const athleteRates = roster
          .map((athlete) => attendanceRateByAthleteId.get(String(athlete.id)))
          .filter(Boolean) as AthleteAttendanceSummary[];

        const avgAttendanceRate =
          athleteRates.length > 0
            ? Math.round(
                athleteRates.reduce((sum, item) => sum + item.rate, 0) / athleteRates.length
              )
            : 0;

        const lowAttendanceAthletes = roster.filter((athlete) => {
          const att = attendanceRateByAthleteId.get(String(athlete.id));
          return att && att.total >= 3 && att.rate < LOW_ATTENDANCE_THRESHOLD;
        }).length;

        const staleAthletes = roster.filter((athlete) => {
          const perf = performanceByAthleteId.get(String(athlete.id));
          if (!perf) return true;
          const staleDays = daysSince(perf.lastTestDate);
          return staleDays !== null && staleDays > STALE_PERFORMANCE_DAYS;
        }).length;

        return {
          team: teamName,
          sport: teamMeta?.sport || roster[0]?.sport || '—',
          rosterCount: roster.length,
          attendanceCount: teamAttendance.length,
          performanceCount: teamPerformance.length,
          avgAttendanceRate,
          lowAttendanceAthletes,
          staleAthletes,
        };
      });

    return results.sort((a, b) => a.team.localeCompare(b.team));
  }, [teams, athletes, attendance, performance, attendanceSummary, performanceSummary]);

  const recentActivity = useMemo(() => {
    const attendanceActivity = attendance.slice(0, 6).map((entry) => ({
      type: 'Attendance',
      title: `${entry.athlete_name || 'Unknown Athlete'} • ${entry.status || 'No status'}`,
      subtitle: `${entry.team || 'Unassigned'}${entry.session_type ? ` • ${entry.session_type}` : ''}`,
      date: entry.date,
      href: '/attendance',
    }));

    const performanceActivity = performance.slice(0, 6).map((entry) => ({
      type: 'Performance',
      title: `${entry.athlete_name || 'Unknown Athlete'} • ${entry.test_name || 'Test'}`,
      subtitle: `${entry.team || 'Unassigned'}${
        entry.value !== null && entry.value !== undefined && entry.value !== ''
          ? ` • ${entry.value}${entry.unit ? ` ${entry.unit}` : ''}`
          : ''
      }`,
      date: entry.date,
      href: '/performance',
    }));

    return [...attendanceActivity, ...performanceActivity]
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [attendance, performance]);

  const headlineStats = useMemo(() => {
    const totalAthletes = athletes.length;
    const totalTeams = teams.length || new Set(athletes.map((a) => a.team).filter(Boolean)).size;
    const totalAttendance = attendance.length;
    const totalPerformance = performance.length;

    const presentStatuses = attendance.filter((item) => {
      const status = (item.status || '').toLowerCase();
      return status === 'present' || status === 'late';
    }).length;

    const attendanceRate =
      totalAttendance > 0 ? Math.round((presentStatuses / totalAttendance) * 100) : 0;

    const athletesWithTests = new Set(
      performance
        .map((item) => item.athlete_id)
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value))
    ).size;

    return {
      totalAthletes,
      totalTeams,
      totalAttendance,
      totalPerformance,
      attendanceRate,
      athletesWithTests,
      athletesWithoutTests: Math.max(totalAthletes - athletesWithTests, 0),
      urgentIssues:
        lowAttendanceAthletes.length +
        stalePerformanceAthletes.length +
        staleAttendanceAthletes.length,
    };
  }, [athletes, teams, attendance, performance, lowAttendanceAthletes, stalePerformanceAthletes, staleAttendanceAthletes]);

  const urgentAlerts = useMemo(() => {
    const alerts: { level: 'high' | 'medium'; title: string; detail: string; href: string }[] = [];

    if (lowAttendanceAthletes.length > 0) {
      alerts.push({
        level: 'high',
        title: `${lowAttendanceAthletes.length} athlete${lowAttendanceAthletes.length === 1 ? '' : 's'} below ${LOW_ATTENDANCE_THRESHOLD}% attendance`,
        detail: 'These athletes are consistently missing or arriving late to sessions.',
        href: '/attendance',
      });
    }

    if (stalePerformanceAthletes.length > 0) {
      alerts.push({
        level: 'medium',
        title: `${stalePerformanceAthletes.length} athlete${stalePerformanceAthletes.length === 1 ? '' : 's'} need updated testing`,
        detail: `No recent performance data in the last ${STALE_PERFORMANCE_DAYS} days, or no tests recorded at all.`,
        href: '/performance',
      });
    }

    if (staleAttendanceAthletes.length > 0) {
      alerts.push({
        level: 'medium',
        title: `${staleAttendanceAthletes.length} athlete${staleAttendanceAthletes.length === 1 ? '' : 's'} have stale attendance records`,
        detail: `No attendance activity in the last ${STALE_ATTENDANCE_DAYS} days, or no attendance logged yet.`,
        href: '/attendance',
      });
    }

    const emptyTeams = teamHealth.filter((team) => team.rosterCount === 0);
    if (emptyTeams.length > 0) {
      alerts.push({
        level: 'medium',
        title: `${emptyTeams.length} team${emptyTeams.length === 1 ? '' : 's'} with no roster`,
        detail: 'These teams exist in the system but currently have no assigned athletes.',
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
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Coach Operations Board
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              This dashboard highlights where attention is needed right now: attendance risk,
              missing testing, stale records, team health, and recent activity.
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
            <p className="mt-2 text-sm text-slate-300">
              Across all active school sport groups in the system.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Teams</p>
            <p className="mt-3 text-3xl font-bold">{headlineStats.totalTeams}</p>
            <p className="mt-2 text-sm text-slate-300">
              Team environments being monitored and managed.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Attendance Rate</p>
            <p className="mt-3 text-3xl font-bold">{headlineStats.attendanceRate}%</p>
            <p className="mt-2 text-sm text-slate-300">
              Based on all logged attendance records marked present or late.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Urgent Issues</p>
            <p className="mt-3 text-3xl font-bold">{headlineStats.urgentIssues}</p>
            <p className="mt-2 text-sm text-slate-300">
              Flags requiring coach follow-up across attendance and testing.
            </p>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Priority Alerts</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Immediate operational issues the system is detecting.
                </p>
              </div>
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
            <p className="mt-1 text-sm text-slate-400">
              Are you collecting enough usable information?
            </p>

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
                  {headlineStats.athletesWithoutTests} athlete
                  {headlineStats.athletesWithoutTests === 1 ? '' : 's'} still need baseline or updated testing.
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
                    key={`low-attendance-${athlete.athleteId}`}
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
                    key={`stale-performance-${athlete.athleteId}`}
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
                  Athletes with no attendance yet, or no recent logged attendance.
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
                    key={`stale-attendance-${athlete.athleteId}`}
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
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recent Activity</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Latest attendance and performance actions across the system.
                </p>
              </div>
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
                A coach-friendly view of roster size, data volume, attendance quality, and follow-up needs.
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
                          href={`/teams/${slugifyTeamName(team.team)}`}
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
                            team.staleAthletes > 0
                              ? 'bg-amber-500/15 text-amber-200'
                              : 'bg-emerald-500/15 text-emerald-200'
                          }`}
                        >
                          {team.staleAthletes}
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