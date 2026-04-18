'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type AttendanceRecord = {
  id: number | string;
  athlete_id: number | string | null;
  athlete_name: string;
  team: string;
  session_type: string;
  status: string;
  date: string;
  created_at?: string | null;
  raw: GenericRow;
};

type AthleteOption = {
  id: number | string;
  name: string;
  team: string;
  raw: GenericRow;
};

/**
 * =========================================================
 * ATTENDANCE TABLE COLUMN MAP
 * =========================================================
 * CHANGE THESE TO MATCH YOUR REAL Attendance TABLE COLUMNS.
 *
 * Example:
 * if your table uses:
 * - player_id instead of athlete_id
 * - player_name instead of athlete_name
 * - session instead of session_type
 * - session_date instead of date
 *
 * then change the values below only.
 */
const ATTENDANCE_COLUMNS = {
  id: 'id',
  athlete_id: 'player_id',
  athlete_name: 'player_name',
  team: 'team',
  session_type: 'session',
  status: 'status',
  date: 'session_date',
} as const;

function firstString(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return '';
}

function normalizeAthlete(row: GenericRow): AthleteOption {
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
    raw: row,
  };
}

function normalizeAttendance(row: GenericRow): AttendanceRecord {
  return {
    id: firstValue(
      row[ATTENDANCE_COLUMNS.id],
      row.id,
      row.attendance_id,
      crypto.randomUUID()
    ),
    athlete_id: ATTENDANCE_COLUMNS.athlete_id
      ? firstValue(row[ATTENDANCE_COLUMNS.athlete_id], row.athlete_id, row.player_id, null) || null
      : null,
    athlete_name:
      firstString(
        row[ATTENDANCE_COLUMNS.athlete_name],
        row.athlete_name,
        row.player_name,
        row.full_name,
        row.name
      ) || 'Unknown Athlete',
    team:
      firstString(
        row[ATTENDANCE_COLUMNS.team],
        row.team,
        row.team_name,
        row.squad
      ) || 'Unassigned',
    session_type:
      firstString(
        row[ATTENDANCE_COLUMNS.session_type],
        row.session_type,
        row.session,
        row.type
      ) || '—',
    status:
      firstString(
        row[ATTENDANCE_COLUMNS.status],
        row.status,
        row.attendance_status
      ) || '—',
    date:
      firstString(
        row[ATTENDANCE_COLUMNS.date],
        row.date,
        row.session_date,
        row.attendance_date,
        row.recorded_date,
        row.created_at
      ) || '',
    created_at: firstString(row.created_at) || null,
    raw: row,
  };
}

function buildAttendancePayload(input: {
  athlete_id: number | string | null;
  athlete_name: string;
  team: string;
  session_type: string;
  status: string;
  date: string;
}) {
  const payload: GenericRow = {
    [ATTENDANCE_COLUMNS.athlete_name]: input.athlete_name,
    [ATTENDANCE_COLUMNS.team]: input.team,
    [ATTENDANCE_COLUMNS.session_type]: input.session_type,
    [ATTENDANCE_COLUMNS.status]: input.status,
    [ATTENDANCE_COLUMNS.date]: input.date,
  };

  if (ATTENDANCE_COLUMNS.athlete_id) {
    payload[ATTENDANCE_COLUMNS.athlete_id] = input.athlete_id;
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

function formatStatus(status: string) {
  const cleaned = (status || '').toLowerCase();
  if (!cleaned) return '—';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getStatusClasses(status: string) {
  const cleaned = (status || '').toLowerCase();

  if (cleaned === 'present') {
    return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/20';
  }

  if (cleaned === 'late') {
    return 'bg-amber-500/15 text-amber-200 border border-amber-500/20';
  }

  if (cleaned === 'absent') {
    return 'bg-red-500/15 text-red-200 border border-red-500/20';
  }

  if (cleaned === 'excused') {
    return 'bg-sky-500/15 text-sky-200 border border-sky-500/20';
  }

  return 'bg-slate-800 text-slate-300 border border-slate-700';
}

export default function AttendancePage() {
  const [attendanceRows, setAttendanceRows] = useState<GenericRow[]>([]);
  const [athleteRows, setAthleteRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [athleteName, setAthleteName] = useState('');
  const [team, setTeam] = useState('');
  const [sessionType, setSessionType] = useState('Training');
  const [status, setStatus] = useState('Present');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [teamFilter, setTeamFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sessionFilter, setSessionFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editSelectedAthleteId, setEditSelectedAthleteId] = useState('');
  const [editAthleteName, setEditAthleteName] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editSessionType, setEditSessionType] = useState('Training');
  const [editStatus, setEditStatus] = useState('Present');
  const [editDate, setEditDate] = useState('');

  async function loadPageData() {
    setLoading(true);
    setError('');

    const [attendanceRes, athletesRes] = await Promise.all([
      supabase.from('Attendance').select('*'),
      supabase.from('athletes').select('*'),
    ]);

    if (attendanceRes.error || athletesRes.error) {
      setError(
        attendanceRes.error?.message ||
          athletesRes.error?.message ||
          'Failed to load attendance data.'
      );
      setAttendanceRows([]);
      setAthleteRows([]);
      setLoading(false);
      return;
    }

    setAttendanceRows((attendanceRes.data as GenericRow[]) || []);
    setAthleteRows((athletesRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPageData();
  }, []);

  const athletes = useMemo(() => {
    return athleteRows
      .map(normalizeAthlete)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [athleteRows]);

  const attendance = useMemo(() => {
    return attendanceRows
      .map(normalizeAttendance)
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      });
  }, [attendanceRows]);

  const athleteOptions = useMemo(() => {
    return athletes.map((athlete) => ({
      value: String(athlete.id),
      label: `${athlete.name}${athlete.team && athlete.team !== 'Unassigned' ? ` • ${athlete.team}` : ''}`,
      athlete,
    }));
  }, [athletes]);

  const uniqueTeams = useMemo(() => {
    return Array.from(
      new Set(
        attendance
          .map((entry) => entry.team)
          .concat(athletes.map((athlete) => athlete.team))
          .filter((value) => value && value !== 'Unassigned')
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [attendance, athletes]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(
      new Set(attendance.map((entry) => formatStatus(entry.status)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [attendance]);

  const uniqueSessionTypes = useMemo(() => {
    return Array.from(
      new Set(attendance.map((entry) => entry.session_type).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((entry) => {
      const matchesTeam = teamFilter === 'All' || entry.team === teamFilter;
      const matchesStatus =
        statusFilter === 'All' || formatStatus(entry.status) === statusFilter;
      const matchesSession =
        sessionFilter === 'All' || entry.session_type === sessionFilter;
      const matchesDate = !dateFilter || entry.date === dateFilter;

      return matchesTeam && matchesStatus && matchesSession && matchesDate;
    });
  }, [attendance, teamFilter, statusFilter, sessionFilter, dateFilter]);

  const summary = useMemo(() => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter(
      (entry) => entry.status.toLowerCase() === 'present'
    ).length;
    const late = filteredAttendance.filter(
      (entry) => entry.status.toLowerCase() === 'late'
    ).length;
    const absent = filteredAttendance.filter(
      (entry) => entry.status.toLowerCase() === 'absent'
    ).length;
    const excused = filteredAttendance.filter(
      (entry) => entry.status.toLowerCase() === 'excused'
    ).length;

    return { total, present, late, absent, excused };
  }, [filteredAttendance]);

  function handleAthleteSelect(value: string) {
    setSelectedAthleteId(value);

    const selected = athletes.find((athlete) => String(athlete.id) === value);

    if (selected) {
      setAthleteName(selected.name);
      setTeam(selected.team || '');
    }
  }

  function handleEditAthleteSelect(value: string) {
    setEditSelectedAthleteId(value);

    const selected = athletes.find((athlete) => String(athlete.id) === value);

    if (selected) {
      setEditAthleteName(selected.name);
      setEditTeam(selected.team || '');
    }
  }

  async function handleAddAttendance(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    if (!athleteName.trim()) {
      setError('Athlete name is required.');
      setSubmitting(false);
      return;
    }

    if (!date) {
      setError('Date is required.');
      setSubmitting(false);
      return;
    }

    const payload = buildAttendancePayload({
      athlete_id: selectedAthleteId ? selectedAthleteId : null,
      athlete_name: athleteName.trim(),
      team: team.trim(),
      session_type: sessionType.trim(),
      status: status.trim(),
      date,
    });

    const result = await supabase.from('Attendance').insert([payload]).select('*').single();

    if (result.error) {
      setError(result.error.message || 'Failed to add attendance record.');
      setSubmitting(false);
      return;
    }

    setSelectedAthleteId('');
    setAthleteName('');
    setTeam('');
    setSessionType('Training');
    setStatus('Present');
    setDate(new Date().toISOString().split('T')[0]);
    setSuccessMessage('Attendance record added successfully.');
    await loadPageData();
    setSubmitting(false);
  }

  function startEdit(record: AttendanceRecord) {
    setEditingId(record.id);

    const matchedAthlete = athletes.find(
      (athlete) =>
        String(athlete.id) === String(record.athlete_id) ||
        athlete.name === record.athlete_name
    );

    setEditSelectedAthleteId(matchedAthlete ? String(matchedAthlete.id) : '');
    setEditAthleteName(record.athlete_name);
    setEditTeam(record.team);
    setEditSessionType(record.session_type || 'Training');
    setEditStatus(formatStatus(record.status) || 'Present');
    setEditDate(record.date || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSelectedAthleteId('');
    setEditAthleteName('');
    setEditTeam('');
    setEditSessionType('Training');
    setEditStatus('Present');
    setEditDate('');
  }

  async function handleSaveEdit(id: number | string) {
    setSavingEdit(true);
    setError('');
    setSuccessMessage('');

    if (!editAthleteName.trim()) {
      setError('Athlete name is required.');
      setSavingEdit(false);
      return;
    }

    if (!editDate) {
      setError('Date is required.');
      setSavingEdit(false);
      return;
    }

    const payload = buildAttendancePayload({
      athlete_id: editSelectedAthleteId ? editSelectedAthleteId : null,
      athlete_name: editAthleteName.trim(),
      team: editTeam.trim(),
      session_type: editSessionType.trim(),
      status: editStatus.trim(),
      date: editDate,
    });

    const result = await supabase
      .from('Attendance')
      .update(payload)
      .eq(ATTENDANCE_COLUMNS.id, id)
      .select('*')
      .single();

    if (result.error) {
      setError(result.error.message || 'Failed to update attendance record.');
      setSavingEdit(false);
      return;
    }

    setSuccessMessage('Attendance record updated successfully.');
    cancelEdit();
    await loadPageData();
    setSavingEdit(false);
  }

  async function handleDeleteAttendance(id: number | string, athleteNameToDelete: string) {
    const confirmed = window.confirm(
      `Delete attendance record for ${athleteNameToDelete}?`
    );
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('Attendance')
      .delete()
      .eq(ATTENDANCE_COLUMNS.id, id);

    if (error) {
      setError(error.message || 'Failed to delete attendance record.');
      return;
    }

    setSuccessMessage('Attendance record deleted successfully.');
    await loadPageData();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              Session Attendance
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Attendance</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Log daily attendance, filter session records quickly, and update errors without
              leaving the page.
            </p>
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

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Filtered Records</p>
            <p className="mt-3 text-3xl font-bold">{summary.total}</p>
            <p className="mt-2 text-sm text-slate-300">Attendance rows matching current filters.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Present</p>
            <p className="mt-3 text-3xl font-bold text-emerald-300">{summary.present}</p>
            <p className="mt-2 text-sm text-slate-300">Athletes marked present.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Late</p>
            <p className="mt-3 text-3xl font-bold text-amber-300">{summary.late}</p>
            <p className="mt-2 text-sm text-slate-300">Athletes marked late.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Absent</p>
            <p className="mt-3 text-3xl font-bold text-red-300">{summary.absent}</p>
            <p className="mt-2 text-sm text-slate-300">Athletes marked absent.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Excused</p>
            <p className="mt-3 text-3xl font-bold text-sky-300">{summary.excused}</p>
            <p className="mt-2 text-sm text-slate-300">Athletes marked excused.</p>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-1">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Add Attendance</h2>
              <p className="mt-1 text-sm text-slate-400">
                Record a session result for an athlete.
              </p>
            </div>

            <form onSubmit={handleAddAttendance} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Select Athlete
                </label>
                <select
                  value={selectedAthleteId}
                  onChange={(e) => handleAthleteSelect(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="">Select athlete</option>
                  {athleteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Athlete Name
                </label>
                <input
                  value={athleteName}
                  onChange={(e) => setAthleteName(e.target.value)}
                  placeholder="Athlete name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Team</label>
                <input
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="Team"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Session Type
                </label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="Training">Training</option>
                  <option value="Match">Match</option>
                  <option value="Gym">Gym</option>
                  <option value="Recovery">Recovery</option>
                  <option value="Testing">Testing</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Adding Attendance...' : 'Add Attendance'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Attendance Records</h2>
              <p className="mt-1 text-sm text-slate-400">
                Filter records by team, date, session type, and attendance status.
              </p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Team
                </label>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="All">All Teams</option>
                  {uniqueTeams.map((teamName) => (
                    <option key={teamName} value={teamName}>
                      {teamName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="All">All Statuses</option>
                  {uniqueStatuses.map((statusName) => (
                    <option key={statusName} value={statusName}>
                      {statusName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Session Type
                </label>
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="All">All Session Types</option>
                  {uniqueSessionTypes.map((sessionName) => (
                    <option key={sessionName} value={sessionName}>
                      {sessionName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                Loading attendance...
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
                No attendance records found for the selected filters.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAttendance.map((record) => {
                  const isEditing = editingId === record.id;

                  return (
                    <div
                      key={String(record.id)}
                      className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                    >
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">
                                Select Athlete
                              </label>
                              <select
                                value={editSelectedAthleteId}
                                onChange={(e) => handleEditAthleteSelect(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              >
                                <option value="">Select athlete</option>
                                {athleteOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">
                                Athlete Name
                              </label>
                              <input
                                value={editAthleteName}
                                onChange={(e) => setEditAthleteName(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">
                                Team
                              </label>
                              <input
                                value={editTeam}
                                onChange={(e) => setEditTeam(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">
                                Session Type
                              </label>
                              <select
                                value={editSessionType}
                                onChange={(e) => setEditSessionType(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              >
                                <option value="Training">Training</option>
                                <option value="Match">Match</option>
                                <option value="Gym">Gym</option>
                                <option value="Recovery">Recovery</option>
                                <option value="Testing">Testing</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">
                                Status
                              </label>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              >
                                <option value="Present">Present</option>
                                <option value="Late">Late</option>
                                <option value="Absent">Absent</option>
                                <option value="Excused">Excused</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">
                                Date
                              </label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleSaveEdit(record.id)}
                              disabled={savingEdit}
                              className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingEdit ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Athlete</p>
                              <p className="mt-1 text-sm font-semibold text-white">
                                {record.athlete_name}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Team</p>
                              <p className="mt-1 text-sm text-slate-300">{record.team}</p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Session
                              </p>
                              <p className="mt-1 text-sm text-slate-300">{record.session_type}</p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
                              <p className="mt-1 text-sm text-slate-300">{formatDate(record.date)}</p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                              <div className="mt-1">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                                    record.status
                                  )}`}
                                >
                                  {formatStatus(record.status)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => startEdit(record)}
                              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteAttendance(record.id, record.athlete_name)
                              }
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}