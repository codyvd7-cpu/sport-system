'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase'
import { safeUUID } from '@/lib/uuid';

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
    id: firstValue(row.id, row.athlete_id, safeUUID()),
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
    id: firstValue(row.id, row.team_id, safeUUID()),
    name: firstString(row.name, row.team, row.team_name) || 'Unnamed Team',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
    season: firstString(row.season, row.year, row.phase) || '—',
    raw: row,
  };
}

function normalizeAttendance(row: GenericRow): AttendanceRecord {
  return {
    id: firstValue(row.id, safeUUID()),
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
    id: firstValue(row.id, safeUUID()),
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

  // Bulk attendance modal state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [bulkTeam, setBulkTeam] = useState('');
  const [bulkSessionType, setBulkSessionType] = useState('Training');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkStatuses, setBulkStatuses] = useState<Record<string, string>>({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);

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
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { window.location.assign('/login?redirect=/'); return; }
      loadDashboard();
    }
    init();
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


  // ── Helpers ──────────────────────────────────────────
  function initials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  // Athletes in currently selected bulk team
  const bulkSquad = useMemo(() => {
    if (!bulkTeam) return [];
    return athletes.filter((a) => a.team === bulkTeam);
  }, [athletes, bulkTeam]);

  // When team changes, reset all statuses to Present
  function selectBulkTeam(team: string) {
    setBulkTeam(team);
    const defaults: Record<string, string> = {};
    athletes.filter((a) => a.team === team).forEach((a) => { defaults[a.id] = 'Present'; });
    setBulkStatuses(defaults);
  }

  function toggleStatus(athleteId: string) {
    setBulkStatuses((prev) => {
      const cycle: Record<string, string> = { Present: 'Absent', Absent: 'Late', Late: 'Excused', Excused: 'Present' };
      return { ...prev, [athleteId]: cycle[prev[athleteId]] || 'Present' };
    });
  }

  async function handleBulkSubmit() {
    if (!bulkTeam || bulkSquad.length === 0) return;
    setBulkSubmitting(true);
    try {
      const rows = bulkSquad.map((athlete) => ({
        athlete_id: athlete.id,
        session_date: bulkDate,
        session_type: bulkSessionType,
        status: bulkStatuses[athlete.id] || 'Present',
      }));
      const { error: insertError } = await supabase.from('Attendance').insert(rows);
      if (insertError) { setError('Failed to save attendance.'); return; }
      setBulkSuccess(true);
      setTimeout(() => {
        setShowAttendanceModal(false);
        setBulkSuccess(false);
        setBulkTeam('');
        setBulkStatuses({});
      }, 1800);
      // Reload attendance data
      const { data } = await supabase.from('Attendance').select('*').order('session_date', { ascending: false });
      if (data) setAttendanceRows(data);
    } finally {
      setBulkSubmitting(false);
    }
  }

  // Recent absences — players marked absent in last 14 days
  const recentAbsences = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    return attendance
      .filter((r) => r.status.toLowerCase() === 'absent' && new Date(r.session_date) >= cutoff)
      .slice(0, 8)
      .map((r) => {
        const athlete = athleteMap.get(r.athlete_id);
        return {
          name: athlete?.name || 'Unknown',
          team: athlete?.team || '—',
          athleteId: r.athlete_id,
          date: r.session_date,
          session: r.session_type,
        };
      });
  }, [attendance, athleteMap]);

  // Upcoming fixtures from portal
  const today = new Date().toISOString().split('T')[0];

  // Team attendance rates
  const teamAttendanceRates = useMemo(() => {
    return teams.map((team) => {
      const teamAthletes = athletes.filter((a) => a.team === team.name);
      const teamAttendance = attendance.filter((r) => {
        const a = athleteMap.get(r.athlete_id);
        return a?.team === team.name;
      });
      const present = teamAttendance.filter((r) => ['present', 'late'].includes(r.status.toLowerCase())).length;
      const rate = teamAttendance.length > 0 ? Math.round((present / teamAttendance.length) * 100) : null;
      return { name: team.name, rate, total: teamAthletes.length, logs: teamAttendance.length };
    }).filter((t) => t.total > 0).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  }, [teams, athletes, attendance, athleteMap]);

  const STATUS_STYLES: Record<string, string> = {
    Present: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Absent: 'bg-red-500/20 text-red-300 border-red-500/30',
    Late: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Excused: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  const uniqueTeamNames = Array.from(new Set(athletes.map((a) => a.team).filter(Boolean))).sort();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── HEADER ──────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">
              St Benedict's College Hockey
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {new Date().toLocaleDateString('en-ZA', { weekday: 'long' })}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <button
            onClick={() => setShowAttendanceModal(true)}
            className="flex items-center gap-2.5 rounded-2xl border border-sky-500/40 bg-sky-500/10 px-5 py-3.5 text-sm font-black text-sky-300 transition hover:bg-sky-500/20 sm:self-start"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Mark Today's Attendance
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* ── QUICK STATS ─────────────────────────────── */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Players', value: athletes.length, color: 'sky' },
            { label: 'Teams', value: teams.length, color: 'sky' },
            { label: 'Attendance Rate', value: `${headlineStats.attendanceRate}%`, color: headlineStats.attendanceRate >= 80 ? 'emerald' : headlineStats.attendanceRate >= 60 ? 'amber' : 'red' },
            { label: 'Recent Absences', value: recentAbsences.length, color: recentAbsences.length === 0 ? 'emerald' : 'amber' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border bg-slate-900 p-4 ${
              s.color === 'sky' ? 'border-sky-500/15' :
              s.color === 'emerald' ? 'border-emerald-500/15' :
              s.color === 'amber' ? 'border-amber-500/15' :
              'border-red-500/15'
            }`}>
              <p className={`text-3xl font-black ${
                s.color === 'sky' ? 'text-white' :
                s.color === 'emerald' ? 'text-emerald-400' :
                s.color === 'amber' ? 'text-amber-400' :
                'text-red-400'
              }`}>{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            </div>
          ))}
        </section>

        {/* ── MAIN CONTENT ────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* LEFT — Absences + Team Attendance */}
          <div className="space-y-6 xl:col-span-2">

            {/* Recent Absences */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Last 14 Days</p>
                  <h2 className="mt-0.5 text-lg font-black text-white">Recent Absences</h2>
                </div>
                <Link href="/attendance" className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:text-white">
                  Full Log →
                </Link>
              </div>

              {recentAbsences.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <span className="text-xl">✅</span>
                  <p className="text-sm text-emerald-300">No absences recorded in the last 14 days.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentAbsences.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-red-500/10 bg-red-500/5 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-xs font-black text-red-400">
                        {initials(a.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/athletes/${a.athleteId}`} className="block truncate text-sm font-bold text-white hover:text-sky-400">
                          {a.name}
                        </Link>
                        <p className="text-xs text-slate-500">{a.team} • {a.session}</p>
                      </div>
                      <p className="shrink-0 text-xs text-slate-500">
                        {new Date(a.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Attendance Rates */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Overview</p>
                  <h2 className="mt-0.5 text-lg font-black text-white">Team Attendance</h2>
                </div>
                <Link href="/teams" className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:text-white">
                  Teams →
                </Link>
              </div>

              {teamAttendanceRates.length === 0 ? (
                <p className="text-sm text-slate-400">No team data yet.</p>
              ) : (
                <div className="space-y-3">
                  {teamAttendanceRates.map((team) => (
                    <div key={team.name}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Link href={`/teams/${encodeURIComponent(team.name)}`} className="text-sm font-semibold text-white hover:text-sky-400">
                          {team.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{team.logs} logs</span>
                          <span className={`text-sm font-black ${
                            team.rate === null ? 'text-slate-500' :
                            team.rate >= 80 ? 'text-emerald-400' :
                            team.rate >= 60 ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {team.rate === null ? '—' : `${team.rate}%`}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            team.rate === null ? 'w-0' :
                            team.rate >= 80 ? 'bg-emerald-500' :
                            team.rate >= 60 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${team.rate ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Recent Activity */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Live Feed</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Recent Activity</h2>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((item, i) => (
                  <Link key={i} href={item.href} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 transition hover:border-slate-700">
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      item.type === 'Attendance' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-violet-500/15 text-violet-400'
                    }`}>
                      {item.type === 'Attendance' ? 'ATT' : 'PRF'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{item.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.subtitle}</p>
                      <p className="mt-0.5 text-[10px] text-slate-600">{formatDate(item.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BULK ATTENDANCE MODAL ───────────────────────── */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-t-3xl border border-slate-700 bg-slate-900 sm:rounded-3xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Quick Entry</p>
                <h2 className="text-lg font-black text-white">Mark Attendance</h2>
              </div>
              <button
                onClick={() => { setShowAttendanceModal(false); setBulkTeam(''); setBulkStatuses({}); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4">
              {bulkSuccess ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <span className="text-5xl">✅</span>
                  <p className="text-lg font-black text-white">Attendance Saved!</p>
                  <p className="text-sm text-slate-400">{bulkSquad.length} players logged for {bulkSessionType}</p>
                </div>
              ) : (
                <>
                  {/* Session setup */}
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Team</label>
                      <select
                        value={bulkTeam}
                        onChange={(e) => selectBulkTeam(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                      >
                        <option value="">Select team...</option>
                        {uniqueTeamNames.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Session</label>
                      <select
                        value={bulkSessionType}
                        onChange={(e) => setBulkSessionType(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                      >
                        {['Training', 'Match', 'Gym', 'Recovery', 'Testing'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Date</label>
                    <input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Player list */}
                  {bulkTeam && bulkSquad.length > 0 && (
                    <>
                      <p className="mb-2 text-xs font-semibold text-slate-400">
                        {bulkSquad.length} players — tap to change status
                      </p>
                      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                        {bulkSquad.map((athlete) => {
                          const status = bulkStatuses[athlete.id] || 'Present';
                          return (
                            <button
                              key={athlete.id}
                              onClick={() => toggleStatus(athlete.id)}
                              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition ${STATUS_STYLES[status]}`}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-slate-300">
                                {initials(athlete.name)}
                              </div>
                              <p className="flex-1 text-sm font-semibold">{athlete.name}</p>
                              <span className="text-xs font-black uppercase tracking-wide">{status}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleBulkSubmit}
                        disabled={bulkSubmitting}
                        className="mt-4 w-full rounded-xl border border-sky-500 bg-sky-500/15 py-3 text-sm font-black text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-50"
                      >
                        {bulkSubmitting ? 'Saving...' : `Save Attendance — ${bulkSquad.length} Players`}
                      </button>
                    </>
                  )}

                  {bulkTeam && bulkSquad.length === 0 && (
                    <p className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-center text-sm text-slate-400">
                      No players found in this team yet.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}