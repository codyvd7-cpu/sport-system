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

type AttendanceView = {
  id: string;
  athlete_id: string;
  athlete_name: string;
  team: string;
  session_type: string;
  status: string;
  date: string;
  created_at: string | null;
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
  const [sessionType, setSessionType] = useState('Training');
  const [status, setStatus] = useState('Present');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [teamFilter, setTeamFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sessionFilter, setSessionFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSelectedAthleteId, setEditSelectedAthleteId] = useState('');
  const [editSessionType, setEditSessionType] = useState('Training');
  const [editStatus, setEditStatus] = useState('Present');
  const [editDate, setEditDate] = useState('');

  // Team bulk attendance state
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [bulkSessionType, setBulkSessionType] = useState('Training');
  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkStatuses, setBulkStatuses] = useState<Record<string, string>>({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  async function loadPageData() {
    setLoading(true);
    setError('');

    const [attendanceRes, athletesRes] = await Promise.all([
      supabase.from('attendance').select('*').order('session_date', { ascending: false }),
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
    return athleteRows.map(normalizeAthlete).sort((a, b) => a.name.localeCompare(b.name));
  }, [athleteRows]);

  const athleteMap = useMemo(() => {
    const map = new Map<string, Athlete>();
    athletes.forEach((athlete) => {
      map.set(String(athlete.id), athlete);
    });
    return map;
  }, [athletes]);

  const attendance = useMemo(() => {
    return attendanceRows
      .map(normalizeAttendance)
      .map((record): AttendanceView => {
        const athlete = athleteMap.get(String(record.athlete_id));

        return {
          id: record.id,
          athlete_id: record.athlete_id,
          athlete_name: athlete?.name || 'Unknown Athlete',
          team: athlete?.team || 'Unassigned',
          session_type: record.session_type,
          status: record.status,
          date: record.session_date,
          created_at: record.created_at,
        };
      })
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      });
  }, [attendanceRows, athleteMap]);

  const athleteOptions = useMemo(() => {
    return athletes.map((athlete) => ({
      value: String(athlete.id),
      label: `${athlete.name}${athlete.team && athlete.team !== 'Unassigned' ? ` • ${athlete.team}` : ''}`,
    }));
  }, [athletes]);

  const uniqueTeams = useMemo(() => {
    return Array.from(
      new Set(attendance.map((entry) => entry.team).filter((value) => value && value !== 'Unassigned'))
    ).sort((a, b) => a.localeCompare(b));
  }, [attendance]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(attendance.map((entry) => formatStatus(entry.status)).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [attendance]);

  const uniqueSessionTypes = useMemo(() => {
    return Array.from(new Set(attendance.map((entry) => entry.session_type).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((entry) => {
      const matchesTeam = teamFilter === 'All' || entry.team === teamFilter;
      const matchesStatus = statusFilter === 'All' || formatStatus(entry.status) === statusFilter;
      const matchesSession = sessionFilter === 'All' || entry.session_type === sessionFilter;
      const matchesDate = !dateFilter || entry.date === dateFilter;

      return matchesTeam && matchesStatus && matchesSession && matchesDate;
    });
  }, [attendance, teamFilter, statusFilter, sessionFilter, dateFilter]);

  const summary = useMemo(() => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter((entry) => entry.status.toLowerCase() === 'present').length;
    const late = filteredAttendance.filter((entry) => entry.status.toLowerCase() === 'late').length;
    const absent = filteredAttendance.filter((entry) => entry.status.toLowerCase() === 'absent').length;
    const excused = filteredAttendance.filter((entry) => entry.status.toLowerCase() === 'excused').length;

    return { total, present, late, absent, excused };
  }, [filteredAttendance]);

  async function handleAddAttendance(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    if (!selectedAthleteId) {
      setError('Please select an athlete.');
      setSubmitting(false);
      return;
    }

    if (!date) {
      setError('Date is required.');
      setSubmitting(false);
      return;
    }

    const payload = {
      athlete_id: selectedAthleteId,
      session_date: date,
      session_type: sessionType.trim(),
      status: status.trim(),
    };

    const result = await supabase.from('attendance').insert([payload]).select('*').single();

    if (result.error) {
      setError(result.error.message || 'Failed to add attendance record.');
      setSubmitting(false);
      return;
    }

    setSelectedAthleteId('');
    setSessionType('Training');
    setStatus('Present');
    setDate(new Date().toISOString().split('T')[0]);
    setSuccessMessage('Attendance record added successfully.');
    await loadPageData();
    setSubmitting(false);
  }

  function startEdit(record: AttendanceView) {
    setEditingId(record.id);
    setEditSelectedAthleteId(record.athlete_id);
    setEditSessionType(record.session_type || 'Training');
    setEditStatus(formatStatus(record.status) || 'Present');
    setEditDate(record.date || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSelectedAthleteId('');
    setEditSessionType('Training');
    setEditStatus('Present');
    setEditDate('');
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    setError('');
    setSuccessMessage('');

    if (!editSelectedAthleteId) {
      setError('Please select an athlete.');
      setSavingEdit(false);
      return;
    }

    if (!editDate) {
      setError('Date is required.');
      setSavingEdit(false);
      return;
    }

    const payload = {
      athlete_id: editSelectedAthleteId,
      session_date: editDate,
      session_type: editSessionType.trim(),
      status: editStatus.trim(),
    };

    const result = await supabase.from('attendance').update(payload).eq('id', id).select('*').single();

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

  async function handleDeleteAttendance(id: string, athleteNameToDelete: string) {
    const confirmed = window.confirm(`Delete attendance record for ${athleteNameToDelete}?`);
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const { error } = await supabase.from('attendance').delete().eq('id', id);

    if (error) {
      setError(error.message || 'Failed to delete attendance record.');
      return;
    }

    setSuccessMessage('Attendance record deleted successfully.');
    await loadPageData();
  }


  // Auto-clear success
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  function initials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  // All unique teams from athletes
  const allTeams = useMemo(() =>
    Array.from(new Set(athletes.map((a) => a.team).filter((t) => t && t !== 'Unassigned'))).sort(),
    [athletes]
  );

  // Athletes in selected team
  const teamSquad = useMemo(() => {
    if (!selectedTeam) return [];
    return athletes.filter((a) => a.team === selectedTeam);
  }, [athletes, selectedTeam]);

  function selectTeam(team: string) {
    setSelectedTeam(team);
    const defaults: Record<string, string> = {};
    athletes.filter((a) => a.team === team).forEach((a) => { defaults[a.id] = 'Present'; });
    setBulkStatuses(defaults);
  }

  function toggleBulkStatus(athleteId: string) {
    setBulkStatuses((prev) => {
      const cycle: Record<string, string> = { Present: 'Absent', Absent: 'Late', Late: 'Excused', Excused: 'Present' };
      return { ...prev, [athleteId]: cycle[prev[athleteId]] || 'Present' };
    });
  }

  async function handleBulkSubmit() {
    if (!selectedTeam || teamSquad.length === 0) return;
    setBulkSubmitting(true);
    setError('');
    try {
      const rows = teamSquad.map((athlete) => ({
        athlete_id: athlete.id,
        session_date: bulkDate,
        session_type: bulkSessionType,
        status: bulkStatuses[athlete.id] || 'Present',
      }));
      const { error: insertError } = await supabase.from('attendance').insert(rows);
      if (insertError) { setError(insertError.message); return; }
      setSuccessMessage(`Attendance saved for ${teamSquad.length} players — ${selectedTeam}`);
      setSelectedTeam(null);
      setBulkStatuses({});
      await loadPageData();
    } finally {
      setBulkSubmitting(false);
    }
  }

  const STATUS_STYLES: Record<string, string> = {
    Present: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
    Absent: 'border-red-500/50 bg-red-500/15 text-red-300',
    Late: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    Excused: 'border-sky-500/50 bg-sky-500/15 text-sky-300',
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">Session Tracking</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">{attendance.length} records logged</p>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {successMessage && <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{successMessage}</div>}

        {/* Summary stats */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Total', value: summary.total, color: 'slate' },
            { label: 'Present', value: summary.present, color: 'emerald' },
            { label: 'Late', value: summary.late, color: 'amber' },
            { label: 'Absent', value: summary.absent, color: 'red' },
            { label: 'Excused', value: summary.excused, color: 'sky' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border bg-slate-900 p-4 ${
              s.color === 'slate' ? 'border-slate-700/60' :
              s.color === 'emerald' ? 'border-emerald-500/20' :
              s.color === 'amber' ? 'border-amber-500/20' :
              s.color === 'red' ? 'border-red-500/20' :
              'border-sky-500/20'
            }`}>
              <p className={`text-3xl font-black ${
                s.color === 'slate' ? 'text-white' :
                s.color === 'emerald' ? 'text-emerald-400' :
                s.color === 'amber' ? 'text-amber-400' :
                s.color === 'red' ? 'text-red-400' :
                'text-sky-400'
              }`}>{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            </div>
          ))}
        </section>

        {/* ── TEAM ATTENDANCE SECTION ─────────────────── */}
        <section className="mb-8">
          {!selectedTeam ? (
            // Team selection grid
            <div>
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Mark Attendance</p>
                <h2 className="mt-0.5 text-xl font-black text-white">Select a Team</h2>
                <p className="mt-1 text-sm text-slate-500">Tap your team to mark today's session.</p>
              </div>
              {loading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                  <p className="text-sm text-slate-400">Loading teams...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {allTeams.map((team) => {
                    const count = athletes.filter((a) => a.team === team).length;
                    return (
                      <button key={team} onClick={() => selectTeam(team)}
                        className="group rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-sky-500/40 hover:bg-sky-500/5">
                        <p className="text-sm font-black text-white leading-snug">{team}</p>
                        <p className="mt-1 text-xs text-slate-500">{count} players</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // Squad marking view
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Marking Attendance</p>
                  <h2 className="mt-0.5 text-xl font-black text-white">{selectedTeam}</h2>
                  <p className="mt-1 text-sm text-slate-500">{teamSquad.length} players — tap name to cycle status</p>
                </div>
                <button onClick={() => { setSelectedTeam(null); setBulkStatuses({}); }}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white">
                  ← Back
                </button>
              </div>

              {/* Session options */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-400">Session Type</label>
                  <select value={bulkSessionType} onChange={(e) => setBulkSessionType(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
                    {['Training', 'Match', 'Gym', 'Recovery', 'Testing'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-400">Date</label>
                  <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
                </div>
              </div>

              {/* Player list */}
              <div className="mb-5 space-y-2">
                {teamSquad.map((athlete) => {
                  const status = bulkStatuses[athlete.id] || 'Present';
                  return (
                    <div key={athlete.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${STATUS_STYLES[status]}`}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">
                        {initials(athlete.name)}
                      </div>
                      <p className="flex-1 text-sm font-semibold text-white">{athlete.name}</p>
                      <div className="flex gap-1.5">
                        {['Present', 'Absent', 'Late', 'Excused'].map((s) => (
                          <button key={s} onClick={() => setBulkStatuses((prev) => ({ ...prev, [athlete.id]: s }))}
                            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${
                              status === s
                                ? s === 'Present' ? 'bg-emerald-500 text-slate-950'
                                  : s === 'Absent' ? 'bg-red-500 text-white'
                                  : s === 'Late' ? 'bg-amber-500 text-slate-950'
                                  : 'bg-sky-500 text-white'
                                : 'bg-white/10 text-slate-400 hover:bg-white/20'
                            }`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={handleBulkSubmit} disabled={bulkSubmitting}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-3 text-sm font-black text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-50">
                {bulkSubmitting ? 'Saving...' : `Save Attendance — ${teamSquad.length} Players`}
              </button>
            </div>
          )}
        </section>

        {/* ── RECORDS LOG ─────────────────────────────── */}
        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">History</p>
            <h2 className="mt-0.5 text-xl font-black text-white">Attendance Log</h2>
          </div>

          {/* Filters */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Team', value: teamFilter, onChange: setTeamFilter, options: ['All', ...uniqueTeams], allLabel: 'All Teams' },
              { label: 'Status', value: statusFilter, onChange: setStatusFilter, options: ['All', ...uniqueStatuses], allLabel: 'All Statuses' },
              { label: 'Session', value: sessionFilter, onChange: setSessionFilter, options: ['All', ...uniqueSessionTypes], allLabel: 'All Sessions' },
            ].map((f) => (
              <div key={f.label}>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">{f.label}</label>
                <select value={f.value} onChange={(e) => f.onChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500">
                  <option value="All">{f.allLabel}</option>
                  {f.options.filter((o) => o !== 'All').map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Date</label>
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
              <p className="text-sm text-slate-400">Loading records...</p>
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <p className="text-sm text-slate-400">No records match your filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAttendance.map((record) => {
                const isEditing = editingId === record.id;
                return (
                  <div key={record.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <select value={editSelectedAthleteId} onChange={(e) => setEditSelectedAthleteId(e.target.value)}
                            className="col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
                            <option value="">Select athlete...</option>
                            {athleteOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <select value={editSessionType} onChange={(e) => setEditSessionType(e.target.value)}
                            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
                            {['Training', 'Match', 'Gym', 'Recovery', 'Testing'].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
                            {['Present', 'Late', 'Absent', 'Excused'].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                            className="col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 sm:col-span-2" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(record.id)} disabled={savingEdit}
                            className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-black text-sky-300 disabled:opacity-50">
                            {savingEdit ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={cancelEdit}
                            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-slate-300">
                          {initials(record.athlete_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/athletes/${record.athlete_id}`}
                              className="text-sm font-bold text-white hover:text-sky-400">
                              {record.athlete_name}
                            </Link>
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${getStatusClasses(record.status)}`}>
                              {formatStatus(record.status)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {record.team} • {record.session_type} • {formatDate(record.date)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => startEdit(record)}
                            className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:text-white">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteAttendance(record.id, record.athlete_name)}
                            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20">
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filteredAttendance.length > 0 && (
            <p className="mt-3 text-center text-xs text-slate-600">
              Showing {filteredAttendance.length} of {attendance.length} records
            </p>
          )}
        </section>
      </div>
    </main>
  );
}