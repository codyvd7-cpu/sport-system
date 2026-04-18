'use client';

import Link from 'next/link';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
    id: firstValue(row.id, row.team_id, crypto.randomUUID()),
    name: firstString(row.name, row.team, row.team_name) || 'Unnamed Team',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
    season: firstString(row.season, row.year, row.phase) || '—',
    raw: row,
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
    ageGroup: firstString(row.age_group, row.agegroup, row.grade_group, row.group) || '—',
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
      <main className="min-h-screen bg-slate-950 text-white">
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
      <main className="min-h-screen bg-slate-950 text-white">
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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              Team Profile
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">{team.name}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {team.sport} • {team.season} • {roster.length} athlete{roster.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/teams"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Back to Teams
            </Link>
            <Link
              href="/attendance"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Attendance Page
            </Link>
            <Link
              href="/performance"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Performance Page
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {successMessage}
          </div>
        ) : null}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Roster Size</p>
            <p className="mt-3 text-3xl font-bold">{roster.length}</p>
            <p className="mt-2 text-sm text-slate-300">Athletes currently assigned to this team.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Attendance Rate</p>
            <p className="mt-3 text-3xl font-bold">{attendanceSummary.rate}%</p>
            <p className="mt-2 text-sm text-slate-300">Present + late across all logged sessions.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Attendance Entries</p>
            <p className="mt-3 text-3xl font-bold">{attendanceSummary.total}</p>
            <p className="mt-2 text-sm text-slate-300">Attendance records linked to this team roster.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Performance Entries</p>
            <p className="mt-3 text-3xl font-bold">{performance.length}</p>
            <p className="mt-2 text-sm text-slate-300">Performance records linked to this team roster.</p>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Team Info</h2>
                <p className="mt-1 text-sm text-slate-400">Edit team details and sync team data to athletes.</p>
              </div>
              {!isEditingTeam ? (
                <button
                  onClick={() => setIsEditingTeam(true)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {!isEditingTeam ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
                  <p className="mt-1 text-sm font-semibold text-white">{team.name}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Sport</p>
                  <p className="mt-1 text-sm text-slate-300">{team.sport}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Season</p>
                  <p className="mt-1 text-sm text-slate-300">{team.season}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Quick View</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {attendanceSummary.present} present • {attendanceSummary.late} late • {attendanceSummary.absent} absent
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Team Name</label>
                  <input
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Sport</label>
                  <input
                    value={teamSportInput}
                    onChange={(e) => setTeamSportInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Season</label>
                  <input
                    value={teamSeasonInput}
                    onChange={(e) => setTeamSeasonInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSaveTeam}
                    disabled={savingTeam}
                    className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingTeam ? 'Saving...' : 'Save Team'}
                  </button>
                  <button
                    onClick={() => setIsEditingTeam(false)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Quick Add Athlete</h2>
              <p className="mt-1 text-sm text-slate-400">Add an athlete directly into this team roster.</p>
            </div>

            <form onSubmit={handleQuickAddAthlete} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Athlete Name</label>
                <input
                  value={quickAthleteName}
                  onChange={(e) => setQuickAthleteName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Sport</label>
                <input
                  value={quickAthleteSport}
                  onChange={(e) => setQuickAthleteSport(e.target.value)}
                  placeholder={team.sport !== '—' ? team.sport : 'e.g. Hockey'}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Age Group</label>
                <input
                  value={quickAthleteAgeGroup}
                  onChange={(e) => setQuickAthleteAgeGroup(e.target.value)}
                  placeholder="e.g. U16"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingQuickAthlete}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingQuickAthlete ? 'Adding...' : 'Add Athlete'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Bulk Team Attendance</h2>
              <p className="mt-1 text-sm text-slate-400">Log one session for the whole team in a single action.</p>
            </div>

            <form onSubmit={handleBulkAttendanceSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Date</label>
                  <input
                    type="date"
                    value={bulkAttendanceDate}
                    onChange={(e) => setBulkAttendanceDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Session Type</label>
                  <select
                    value={bulkAttendanceSessionType}
                    onChange={(e) => setBulkAttendanceSessionType(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  >
                    <option value="Training">Training</option>
                    <option value="Match">Match</option>
                    <option value="Gym">Gym</option>
                    <option value="Recovery">Recovery</option>
                    <option value="Testing">Testing</option>
                  </select>
                </div>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {roster.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No athletes in roster yet.
                  </div>
                ) : (
                  roster.map((athlete) => (
                    <div
                      key={athlete.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{athlete.name}</p>
                        <p className="text-xs text-slate-400">{athlete.ageGroup}</p>
                      </div>

                      <select
                        value={bulkAttendanceStatusMap[athlete.id] || 'Present'}
                        onChange={(e) =>
                          setBulkAttendanceStatusMap((prev) => ({
                            ...prev,
                            [athlete.id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition md:w-40 focus:border-sky-500"
                      >
                        <option value="Present">Present</option>
                        <option value="Late">Late</option>
                        <option value="Absent">Absent</option>
                        <option value="Excused">Excused</option>
                      </select>
                    </div>
                  ))
                )}
              </div>

              <button
                type="submit"
                disabled={savingBulkAttendance}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingBulkAttendance ? 'Logging...' : 'Log Team Attendance'}
              </button>
            </form>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Roster</h2>
            <p className="mt-1 text-sm text-slate-400">Edit athletes inside the roster or remove them from the team.</p>
          </div>

          {roster.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              No athletes assigned to this team yet.
            </div>
          ) : (
            <div className="space-y-4">
              {roster.map((athlete) => {
                const isEditing = editingRosterAthleteId === athlete.id;

                return (
                  <div key={athlete.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Name</label>
                            <input
                              value={editRosterName}
                              onChange={(e) => setEditRosterName(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Sport</label>
                            <input
                              value={editRosterSport}
                              onChange={(e) => setEditRosterSport(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Age Group</label>
                            <input
                              value={editRosterAgeGroup}
                              onChange={(e) => setEditRosterAgeGroup(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleSaveRosterAthlete(athlete)}
                            disabled={savingRosterEdit}
                            className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingRosterEdit ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelRosterEdit}
                            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Athlete</p>
                            <p className="mt-1 text-sm font-semibold text-white">{athlete.name}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Sport</p>
                            <p className="mt-1 text-sm text-slate-300">{athlete.sport}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Age Group</p>
                            <p className="mt-1 text-sm text-slate-300">{athlete.ageGroup}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Profile</p>
                            <Link
                              href={`/athletes/${athlete.id}`}
                              className="mt-1 inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
                            >
                              Open Athlete
                            </Link>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => startRosterEdit(athlete)}
                            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveAthleteFromTeam(athlete)}
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Player Attendance Snapshot</h2>
              <p className="mt-1 text-sm text-slate-400">Fast attendance view across the roster.</p>
            </div>

            {playerAttendanceSnapshot.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No attendance data yet.
              </div>
            ) : (
              <div className="space-y-3">
                {playerAttendanceSnapshot.map((row) => (
                  <div
                    key={row.athleteId}
                    className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{row.athleteName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {row.total} entries • Latest: {row.latest ? formatDate(row.latest) : '—'}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.rate >= 80
                          ? 'bg-emerald-500/15 text-emerald-200'
                          : row.rate >= 60
                          ? 'bg-amber-500/15 text-amber-200'
                          : 'bg-red-500/15 text-red-200'
                      }`}
                    >
                      {row.rate}% attendance
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Team Performance Leaderboard</h2>
              <p className="mt-1 text-sm text-slate-400">Top performers across recent tests in this team.</p>
            </div>

            {teamPerformanceLeaderboard.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No performance data yet.
              </div>
            ) : (
              <div className="space-y-4">
                {teamPerformanceLeaderboard.map((group) => (
                  <div key={group.testType} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <h3 className="text-sm font-semibold text-white">{group.testType}</h3>
                    <div className="mt-3 space-y-2">
                      {group.entries.map((entry, index) => (
                        <div
                          key={`${group.testType}-${entry.athleteName}-${index}`}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              #{index + 1} {entry.athleteName}
                            </p>
                            <p className="text-xs text-slate-400">{formatDate(entry.date)}</p>
                          </div>
                          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                            {entry.result}
                            {entry.unit ? ` ${entry.unit}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Quick Attendance View</h2>
              <p className="mt-1 text-sm text-slate-400">Recent team attendance records.</p>
            </div>

            {recentAttendance.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No recent attendance entries.
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {athleteMap.get(record.athlete_id)?.name || 'Unknown Athlete'}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {record.session_type} • {formatDate(record.session_date)}
                      </p>
                    </div>

                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(record.status)}`}>
                      {formatStatus(record.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Recent Performance Entries</h2>
              <p className="mt-1 text-sm text-slate-400">Most recent testing results across the roster.</p>
            </div>

            {recentPerformance.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No recent performance entries.
              </div>
            ) : (
              <div className="space-y-3">
                {recentPerformance.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{record.athlete_name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {record.test_type} • {formatDate(record.test_date)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{record.notes || 'No notes'}</p>
                      </div>

                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                        {formatResult(record.result, record.unit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}