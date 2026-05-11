'use client';

import Link from 'next/link';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'
import { safeUUID } from '@/lib/uuid';

type GenericRow = Record<string, any>;

type PageProps = {
  params: Promise<{
    name: string;
  }>;
};

type Team = {
  id: string;
  name: string;
  sport: string;
  season: string;
  raw: GenericRow;
};

type Athlete = {
  id: string;
  name: string;
  team: string;
  sport: string;
  ageGroup: string;
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

function normalizeTeam(row: GenericRow): Team {
  return {
    id: firstValue(row.id, row.team_id, safeUUID()),
    name: firstString(row.name, row.team, row.team_name) || 'Unnamed Team',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
    season: firstString(row.season, row.year, row.phase) || '—',
    raw: row,
  };
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

function buildTeamUpdatePayload(raw: GenericRow, input: { name: string; sport: string; season: string }) {
  const payload: GenericRow = {};

  if ('name' in raw) payload.name = input.name;
  else if ('team' in raw) payload.team = input.name;
  else if ('team_name' in raw) payload.team_name = input.name;

  if ('sport' in raw) payload.sport = input.sport;
  else if ('code' in raw) payload.code = input.sport;
  else if ('discipline' in raw) payload.discipline = input.sport;

  if ('season' in raw) payload.season = input.season;
  else if ('year' in raw) payload.year = input.season;
  else if ('phase' in raw) payload.phase = input.season;

  return payload;
}

function buildAthleteUpdatePayload(raw: GenericRow, input: { name?: string; team?: string; sport?: string; ageGroup?: string }) {
  const payload: GenericRow = {};

  if (input.name !== undefined) {
    if ('name' in raw) payload.name = input.name;
    else if ('full_name' in raw) payload.full_name = input.name;
    else if ('athlete_name' in raw) payload.athlete_name = input.name;
    else if ('player_name' in raw) payload.player_name = input.name;
    else if ('first_name' in raw && 'last_name' in raw) {
      const parts = input.name.trim().split(' ');
      payload.first_name = parts.shift() || input.name;
      payload.last_name = parts.join(' ');
    }
  }

  if (input.team !== undefined) {
    if ('team' in raw) payload.team = input.team;
    else if ('team_name' in raw) payload.team_name = input.team;
    else if ('squad' in raw) payload.squad = input.team;
    else if ('group_name' in raw) payload.group_name = input.team;
  }

  if (input.sport !== undefined) {
    if ('sport' in raw) payload.sport = input.sport;
    else if ('code' in raw) payload.code = input.sport;
    else if ('discipline' in raw) payload.discipline = input.sport;
  }

  if (input.ageGroup !== undefined) {
    if ('age_group' in raw) payload.age_group = input.ageGroup;
    else if ('agegroup' in raw) payload.agegroup = input.ageGroup;
    else if ('grade_group' in raw) payload.grade_group = input.ageGroup;
    else if ('group' in raw) payload.group = input.ageGroup;
  }

  return payload;
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

function formatDateTime(dateString?: string | null) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatus(status: string) {
  const cleaned = (status || '').toLowerCase();
  if (!cleaned) return '—';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getStatusClasses(status: string) {
  const cleaned = (status || '').toLowerCase();

  if (cleaned === 'present') return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/20';
  if (cleaned === 'late') return 'bg-amber-500/15 text-amber-200 border border-amber-500/20';
  if (cleaned === 'absent') return 'bg-red-500/15 text-red-200 border border-red-500/20';
  if (cleaned === 'excused') return 'bg-sky-500/15 text-sky-200 border border-sky-500/20';

  return 'bg-slate-800 text-slate-300 border border-slate-700';
}

function formatResult(result: number | null, unit: string) {
  if (result === null || Number.isNaN(result)) return '—';
  return `${result}${unit ? ` ${unit}` : ''}`;
}

export default function TeamProfilePage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const routeTeamName = decodeURIComponent(resolvedParams.name);
  const router = useRouter();

  const [teamRows, setTeamRows] = React.useState<GenericRow[]>([]);
  const [athleteRows, setAthleteRows] = React.useState<GenericRow[]>([]);
  const [attendanceRows, setAttendanceRows] = React.useState<GenericRow[]>([]);
  const [performanceRows, setPerformanceRows] = React.useState<GenericRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

  const [isEditingTeam, setIsEditingTeam] = React.useState(false);
  const [teamNameInput, setTeamNameInput] = React.useState('');
  const [teamSportInput, setTeamSportInput] = React.useState('');
  const [teamSeasonInput, setTeamSeasonInput] = React.useState('');
  const [savingTeam, setSavingTeam] = React.useState(false);

  const [quickAthleteName, setQuickAthleteName] = React.useState('');
  const [quickAthleteSport, setQuickAthleteSport] = React.useState('');
  const [quickAthleteAgeGroup, setQuickAthleteAgeGroup] = React.useState('');
  const [savingQuickAthlete, setSavingQuickAthlete] = React.useState(false);

  const [editingRosterAthleteId, setEditingRosterAthleteId] = React.useState<string | null>(null);
  const [editRosterName, setEditRosterName] = React.useState('');
  const [editRosterSport, setEditRosterSport] = React.useState('');
  const [editRosterAgeGroup, setEditRosterAgeGroup] = React.useState('');
  const [savingRosterEdit, setSavingRosterEdit] = React.useState(false);

  const [bulkAttendanceDate, setBulkAttendanceDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [bulkAttendanceSessionType, setBulkAttendanceSessionType] = React.useState('Training');
  const [bulkAttendanceStatusMap, setBulkAttendanceStatusMap] = React.useState<Record<string, string>>({});
  const [savingBulkAttendance, setSavingBulkAttendance] = React.useState(false);

  async function loadPageData() {
    setLoading(true);
    setError('');

    const [teamsRes, athletesRes, attendanceRes, performanceRes] = await Promise.all([
      supabase.from('Teams').select('*'),
      supabase.from('athletes').select('*'),
      supabase.from('Attendance').select('*').order('session_date', { ascending: false }),
      supabase.from('Performance').select('*').order('test_date', { ascending: false }),
    ]);

    if (teamsRes.error || athletesRes.error || attendanceRes.error || performanceRes.error) {
      setError(
        teamsRes.error?.message ||
          athletesRes.error?.message ||
          attendanceRes.error?.message ||
          performanceRes.error?.message ||
          'Failed to load team page.'
      );
      setTeamRows([]);
      setAthleteRows([]);
      setAttendanceRows([]);
      setPerformanceRows([]);
      setLoading(false);
      return;
    }

    setTeamRows((teamsRes.data as GenericRow[]) || []);
    setAthleteRows((athletesRes.data as GenericRow[]) || []);
    setAttendanceRows((attendanceRes.data as GenericRow[]) || []);
    setPerformanceRows((performanceRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  React.useEffect(() => {
    loadPageData();
  }, []);

  const teams = React.useMemo(() => {
    return teamRows.map(normalizeTeam).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamRows]);

  const team = React.useMemo(() => {
    return teams.find((item) => item.name === routeTeamName) || null;
  }, [teams, routeTeamName]);

  const athletes = React.useMemo(() => {
    return athleteRows.map(normalizeAthlete).sort((a, b) => a.name.localeCompare(b.name));
  }, [athleteRows]);

  const roster = React.useMemo(() => {
    return athletes.filter((athlete) => athlete.team === routeTeamName);
  }, [athletes, routeTeamName]);

  const athleteMap = React.useMemo(() => {
    const map = new Map<string, Athlete>();
    athletes.forEach((athlete) => map.set(athlete.id, athlete));
    return map;
  }, [athletes]);

  const rosterAthleteIds = React.useMemo(() => new Set(roster.map((athlete) => athlete.id)), [roster]);

  const attendance = React.useMemo(() => {
    return attendanceRows
      .map(normalizeAttendance)
      .filter((record) => rosterAthleteIds.has(record.athlete_id))
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }, [attendanceRows, rosterAthleteIds]);

  const performance = React.useMemo(() => {
    return performanceRows
      .map(normalizePerformance)
      .filter((record) => rosterAthleteIds.has(record.athlete_id))
      .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
  }, [performanceRows, rosterAthleteIds]);

  const recentAttendance = React.useMemo(() => attendance.slice(0, 10), [attendance]);

  const recentPerformance = React.useMemo(() => {
    return performance.slice(0, 10).map((record) => ({
      ...record,
      athlete_name: athleteMap.get(record.athlete_id)?.name || 'Unknown Athlete',
      team: athleteMap.get(record.athlete_id)?.team || 'Unassigned',
    }));
  }, [performance, athleteMap]);

  const attendanceSummary = React.useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((item) => item.status.toLowerCase() === 'present').length;
    const late = attendance.filter((item) => item.status.toLowerCase() === 'late').length;
    const absent = attendance.filter((item) => item.status.toLowerCase() === 'absent').length;
    const excused = attendance.filter((item) => item.status.toLowerCase() === 'excused').length;
    const positive = present + late;
    const rate = total > 0 ? Math.round((positive / total) * 100) : 0;

    return { total, present, late, absent, excused, rate };
  }, [attendance]);

  const playerAttendanceSnapshot = React.useMemo(() => {
    return roster
      .map((athlete) => {
        const athleteAttendance = attendance.filter((entry) => entry.athlete_id === athlete.id);
        const total = athleteAttendance.length;
        const positive = athleteAttendance.filter((entry) => {
          const status = entry.status.toLowerCase();
          return status === 'present' || status === 'late';
        }).length;

        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          total,
          rate: total > 0 ? Math.round((positive / total) * 100) : 0,
          latest: athleteAttendance.length > 0 ? athleteAttendance[0].session_date : '',
        };
      })
      .sort((a, b) => a.athleteName.localeCompare(b.athleteName));
  }, [roster, attendance]);

  const teamPerformanceLeaderboard = React.useMemo(() => {
    const grouped = new Map<string, { athleteName: string; testType: string; result: number; unit: string; date: string }[]>();

    performance.forEach((record) => {
      if (record.result === null) return;
      const athleteName = athleteMap.get(record.athlete_id)?.name || 'Unknown Athlete';
      if (!grouped.has(record.test_type)) grouped.set(record.test_type, []);
      grouped.get(record.test_type)!.push({
        athleteName,
        testType: record.test_type,
        result: record.result,
        unit: record.unit,
        date: record.test_date,
      });
    });

    return Array.from(grouped.entries())
      .map(([testType, rows]) => ({
        testType,
        entries: rows.sort((a, b) => b.result - a.result).slice(0, 5),
      }))
      .slice(0, 4);
  }, [performance, athleteMap]);

  React.useEffect(() => {
    if (!team) return;
    setTeamNameInput(team.name);
    setTeamSportInput(team.sport === '—' ? '' : team.sport);
    setTeamSeasonInput(team.season === '—' ? '' : team.season);
  }, [team]);

  React.useEffect(() => {
    const initial: Record<string, string> = {};
    roster.forEach((athlete) => {
      initial[athlete.id] = 'Present';
    });
    setBulkAttendanceStatusMap(initial);
  }, [roster]);

  async function handleSaveTeam() {
    if (!team) return;

    setSavingTeam(true);
    setError('');
    setSuccessMessage('');

    if (!teamNameInput.trim()) {
      setError('Team name is required.');
      setSavingTeam(false);
      return;
    }

    const oldTeamName = team.name;
    const newTeamName = teamNameInput.trim();
    const newSport = teamSportInput.trim();

    const teamPayload = buildTeamUpdatePayload(team.raw, {
      name: newTeamName,
      sport: newSport,
      season: teamSeasonInput.trim(),
    });

    const teamResult = await supabase.from('Teams').update(teamPayload).eq('id', team.id).select('*').single();

    if (teamResult.error) {
      setError(teamResult.error.message || 'Failed to update team.');
      setSavingTeam(false);
      return;
    }

    for (const athlete of roster) {
      const athletePayload = buildAthleteUpdatePayload(athlete.raw, {
        team: newTeamName,
        sport: newSport || athlete.sport,
      });

      const athleteResult = await supabase.from('athletes').update(athletePayload).eq('id', athlete.id);
      if (athleteResult.error) {
        setError(athleteResult.error.message || 'Team updated, but athlete sync failed.');
        setSavingTeam(false);
        await loadPageData();
        return;
      }
    }

    setSuccessMessage('Team updated and athlete records synced successfully.');
    setIsEditingTeam(false);
    await loadPageData();
    setSavingTeam(false);

    if (oldTeamName !== newTeamName) {
      router.replace(`/teams/${encodeURIComponent(newTeamName)}`);
    }
  }

  async function handleQuickAddAthlete(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;

    setSavingQuickAthlete(true);
    setError('');
    setSuccessMessage('');

    if (!quickAthleteName.trim()) {
      setError('Athlete name is required.');
      setSavingQuickAthlete(false);
      return;
    }

    const payload = {
      name: quickAthleteName.trim(),
      team: team.name,
      sport: team.sport === '—' ? quickAthleteSport.trim() : team.sport,
      age_group: quickAthleteAgeGroup.trim(),
    };

    const result = await supabase.from('athletes').insert([payload]).select('*').single();

    if (result.error) {
      setError(result.error.message || 'Failed to add athlete to team.');
      setSavingQuickAthlete(false);
      return;
    }

    setQuickAthleteName('');
    setQuickAthleteSport('');
    setQuickAthleteAgeGroup('');
    setSuccessMessage('Athlete added to team.');
    await loadPageData();
    setSavingQuickAthlete(false);
  }

  function startRosterEdit(athlete: Athlete) {
    setEditingRosterAthleteId(athlete.id);
    setEditRosterName(athlete.name);
    setEditRosterSport(athlete.sport === '—' ? '' : athlete.sport);
    setEditRosterAgeGroup(athlete.ageGroup === '—' ? '' : athlete.ageGroup);
  }

  function cancelRosterEdit() {
    setEditingRosterAthleteId(null);
    setEditRosterName('');
    setEditRosterSport('');
    setEditRosterAgeGroup('');
  }

  async function handleSaveRosterAthlete(athlete: Athlete) {
    setSavingRosterEdit(true);
    setError('');
    setSuccessMessage('');

    if (!editRosterName.trim()) {
      setError('Athlete name is required.');
      setSavingRosterEdit(false);
      return;
    }

    const payload = buildAthleteUpdatePayload(athlete.raw, {
      name: editRosterName.trim(),
      team: team?.name || athlete.team,
      sport: editRosterSport.trim(),
      ageGroup: editRosterAgeGroup.trim(),
    });

    const result = await supabase.from('athletes').update(payload).eq('id', athlete.id).select('*').single();

    if (result.error) {
      setError(result.error.message || 'Failed to update athlete.');
      setSavingRosterEdit(false);
      return;
    }

    setSuccessMessage('Athlete updated.');
    cancelRosterEdit();
    await loadPageData();
    setSavingRosterEdit(false);
  }

  async function handleRemoveAthleteFromTeam(athlete: Athlete) {
    const confirmed = window.confirm(`Remove ${athlete.name} from ${team?.name}?`);
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const payload = buildAthleteUpdatePayload(athlete.raw, {
      team: '',
    });

    const result = await supabase.from('athletes').update(payload).eq('id', athlete.id);

    if (result.error) {
      setError(result.error.message || 'Failed to remove athlete from team.');
      return;
    }

    setSuccessMessage('Athlete removed from team.');
    await loadPageData();
  }

  async function handleBulkAttendanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;

    setSavingBulkAttendance(true);
    setError('');
    setSuccessMessage('');

    if (!bulkAttendanceDate) {
      setError('Date is required.');
      setSavingBulkAttendance(false);
      return;
    }

    if (roster.length === 0) {
      setError('There are no athletes in this team.');
      setSavingBulkAttendance(false);
      return;
    }

    const payloads = roster.map((athlete) => ({
      athlete_id: athlete.id,
      session_date: bulkAttendanceDate,
      session_type: bulkAttendanceSessionType.trim(),
      status: (bulkAttendanceStatusMap[athlete.id] || 'Present').trim(),
    }));

    const result = await supabase.from('Attendance').insert(payloads).select('*');

    if (result.error) {
      setError(result.error.message || 'Failed to log bulk team attendance.');
      setSavingBulkAttendance(false);
      return;
    }

    setSuccessMessage('Bulk team attendance logged successfully.');
    await loadPageData();
    setSavingBulkAttendance(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
            Loading team page...
          </div>
        </div>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h1 className="text-2xl font-bold text-white">Team not found</h1>
            <p className="mt-2 text-sm text-slate-300">This team does not exist in the current dataset.</p>
            <Link
              href="/teams"
              className="mt-4 inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
            >
              Back to Teams
            </Link>
          </div>
        </div>
      </main>
    );
  }


  // Auto-clear success
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  function initials(name: string) {
    return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading team...</p>
          </div>
        </div>
      </main>
    );
  }

  if (teamNotFound) {
    return (
      <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-lg font-black text-white">Team not found</p>
            <Link href="/teams" className="mt-4 inline-block text-sm text-sky-400 hover:text-sky-300">← Back to Teams</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <Link href="/teams" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300">
            ← Teams
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 text-lg font-black text-sky-400">
              {initials(teamName)}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">Team Overview</p>
              <h1 className="mt-0.5 text-3xl font-black tracking-tight text-white sm:text-4xl">{teamName}</h1>
              {team && <p className="mt-1 text-sm text-slate-500">{team.sport !== '—' ? team.sport : 'Hockey'} • {team.season !== '—' ? team.season : ''}</p>}
            </div>
          </div>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {successMessage && <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{successMessage}</div>}

        {/* Stats */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Players', value: athletes.length, color: 'sky' },
            { label: 'Sessions Logged', value: attendanceSummary.totalSessions, color: 'emerald' },
            { label: 'Attendance Rate', value: `${attendanceSummary.overallRate}%`, color: attendanceSummary.overallRate >= 80 ? 'emerald' : attendanceSummary.overallRate >= 60 ? 'amber' : 'red' },
            { label: 'Perf. Records', value: performanceSummary.totalRecords, color: 'violet' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border bg-slate-900 p-4 ${
              s.color === 'sky' ? 'border-sky-500/20' :
              s.color === 'emerald' ? 'border-emerald-500/20' :
              s.color === 'amber' ? 'border-amber-500/20' :
              s.color === 'red' ? 'border-red-500/20' :
              'border-violet-500/20'
            }`}>
              <p className={`text-3xl font-black ${
                s.color === 'sky' ? 'text-sky-400' :
                s.color === 'emerald' ? 'text-emerald-400' :
                s.color === 'amber' ? 'text-amber-400' :
                s.color === 'red' ? 'text-red-400' :
                'text-violet-400'
              }`}>{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          {/* Squad */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Squad</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Players ({athletes.length})</h2>
            </div>
            {athletes.length === 0 ? (
              <p className="text-sm text-slate-500">No players assigned to this team yet.</p>
            ) : (
              <div className="space-y-2">
                {athletes.map((athlete) => {
                  const recs = attendanceByAthlete[athlete.id] || [];
                  const present = recs.filter((r) => ['present','late'].includes(r.status.toLowerCase())).length;
                  const rate = recs.length > 0 ? Math.round((present / recs.length) * 100) : null;
                  return (
                    <div key={athlete.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-black text-sky-400">
                        {initials(athlete.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/athletes/${athlete.id}`} className="block truncate text-sm font-bold text-white hover:text-sky-400">
                          {athlete.name}
                        </Link>
                        {athlete.ageGroup && athlete.ageGroup !== '—' && (
                          <p className="text-xs text-slate-500">{athlete.ageGroup}</p>
                        )}
                      </div>
                      {rate !== null && (
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                          rate >= 80 ? 'bg-emerald-500/15 text-emerald-400' :
                          rate >= 60 ? 'bg-amber-500/15 text-amber-400' :
                          'bg-red-500/15 text-red-400'
                        }`}>{rate}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attendance summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Attendance</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Session Breakdown</h2>
            </div>
            {attendanceSummary.totalSessions === 0 ? (
              <p className="text-sm text-slate-500">No attendance records yet.</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Present', value: attendanceSummary.present, color: 'emerald' },
                  { label: 'Late', value: attendanceSummary.late, color: 'amber' },
                  { label: 'Absent', value: attendanceSummary.absent, color: 'red' },
                  { label: 'Excused', value: attendanceSummary.excused, color: 'sky' },
                ].map((s) => {
                  const pct = attendanceSummary.totalSessions > 0 ? Math.round((s.value / attendanceSummary.totalSessions) * 100) : 0;
                  return (
                    <div key={s.label}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-300">{s.label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{s.value} records</span>
                          <span className={`text-sm font-black ${
                            s.color === 'emerald' ? 'text-emerald-400' :
                            s.color === 'amber' ? 'text-amber-400' :
                            s.color === 'red' ? 'text-red-400' : 'text-sky-400'
                          }`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div className={`h-full rounded-full ${
                          s.color === 'emerald' ? 'bg-emerald-500' :
                          s.color === 'amber' ? 'bg-amber-500' :
                          s.color === 'red' ? 'bg-red-500' : 'bg-sky-500'
                        }`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                  <p className="text-2xl font-black text-white">{attendanceSummary.overallRate}%</p>
                  <p className="text-xs text-slate-500">Overall attendance rate</p>
                </div>
              </div>
            )}
          </div>

          {/* Performance summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Testing</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Performance Overview</h2>
            </div>
            {performanceSummary.totalRecords === 0 ? (
              <p className="text-sm text-slate-500">No performance records yet. Run a testing session to see data here.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="py-3 pr-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">Athlete</th>
                      {performanceSummary.testTypes.map((t) => (
                        <th key={t} className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-500 whitespace-nowrap">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {athletes.map((athlete) => (
                      <tr key={athlete.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 pr-4">
                          <Link href={`/athletes/${athlete.id}`} className="text-sm font-bold text-white hover:text-sky-400">
                            {athlete.name}
                          </Link>
                        </td>
                        {performanceSummary.testTypes.map((testType) => {
                          const recs = (performanceByAthlete[athlete.id] || []).filter((r) => r.test_type === testType);
                          const latest = [...recs].sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];
                          if (!latest) return (
                            <td key={testType} className="px-2 py-3 text-center">
                              <span className="text-xs text-slate-700">—</span>
                            </td>
                          );
                          const isQual = latest.unit && !['s','m','cm','reps','kg','%'].includes(latest.unit);
                          const display = isQual ? latest.unit : `${latest.result}${latest.unit ? ` ${latest.unit}` : ''}`;
                          return (
                            <td key={testType} className="px-2 py-3 text-center">
                              <span className="text-xs font-bold text-white">{display}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}