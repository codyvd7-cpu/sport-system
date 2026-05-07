'use client';

import Link from 'next/link';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeUUID } from '@/lib/uuid';

type GenericRow = Record<string, any>;
type PageProps = { params: Promise<{ id: string }> };
type Athlete = { id: string; name: string; team: string; sport: string; ageGroup: string; raw: GenericRow };
type AttendanceRecord = { id: string; athlete_id: string; session_date: string; session_type: string; status: string; created_at: string | null; raw: GenericRow };
type PerformanceRecord = { id: string; athlete_id: string; test_date: string; test_type: string; result: number | null; unit: string; notes: string; created_at: string | null; raw: GenericRow };

function firstString(...values: any[]) { for (const v of values) { if (typeof v === 'string' && v.trim() !== '') return v.trim(); } return ''; }
function firstValue(...values: any[]) { for (const v of values) { if (v !== null && v !== undefined && v !== '') return String(v); } return ''; }
function firstNumber(...values: any[]) { for (const v of values) { if (v === null || v === undefined || v === '') continue; const n = Number(v); if (!Number.isNaN(n)) return n; } return null; }

function normalizeAthlete(row: GenericRow): Athlete {
  return {
    id: firstValue(row.id, row.athlete_id, safeUUID()),
    name: firstString(row.name, row.full_name, row.athlete_name, row.player_name, row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : '', row.first_name) || 'Unknown',
    team: firstString(row.team, row.team_name, row.squad, row.group_name) || 'Unassigned',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
    ageGroup: firstString(row.age_group, row.agegroup, row.grade_group, row.group) || '—',
    raw: row,
  };
}
function normalizeAttendance(row: GenericRow): AttendanceRecord {
  return { id: firstValue(row.id, safeUUID()), athlete_id: firstValue(row.athlete_id), session_date: firstString(row.session_date), session_type: firstString(row.session_type) || '—', status: firstString(row.status) || '—', created_at: firstString(row.created_at) || null, raw: row };
}
function normalizePerformance(row: GenericRow): PerformanceRecord {
  return { id: firstValue(row.id, safeUUID()), athlete_id: firstValue(row.athlete_id), test_date: firstString(row.test_date), test_type: firstString(row.test_type) || '—', result: firstNumber(row.result), unit: firstString(row.unit) || '', notes: firstString(row.notes) || '', created_at: firstString(row.created_at) || null, raw: row };
}
function formatDate(d?: string | null) { if (!d) return '—'; const date = new Date(d); if (Number.isNaN(date.getTime())) return '—'; return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatStatus(s: string) { const c = (s || '').toLowerCase(); if (!c) return '—'; return c.charAt(0).toUpperCase() + c.slice(1); }
function getStatusClasses(s: string) { const c = (s || '').toLowerCase(); if (c === 'present') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'; if (c === 'late') return 'bg-amber-500/15 text-amber-300 border border-amber-500/20'; if (c === 'absent') return 'bg-red-500/15 text-red-300 border border-red-500/20'; if (c === 'excused') return 'bg-sky-500/15 text-sky-300 border border-sky-500/20'; return 'bg-slate-800 text-slate-300 border border-slate-700'; }
function formatResult(result: number | null, unit: string) { if (result === null || Number.isNaN(result)) return '—'; return `${result}${unit ? ` ${unit}` : ''}`; }
function buildAthleteUpdatePayload(raw: GenericRow, input: { name: string; team: string; sport: string; ageGroup: string }) {
  const p: GenericRow = {};
  if ('name' in raw) p.name = input.name; else if ('full_name' in raw) p.full_name = input.name; else if ('athlete_name' in raw) p.athlete_name = input.name;
  if ('team' in raw) p.team = input.team; else if ('team_name' in raw) p.team_name = input.team;
  if ('age_group' in raw) p.age_group = input.ageGroup; else if ('agegroup' in raw) p.agegroup = input.ageGroup;
  return p;
}
function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(); }

export default function AthleteProfilePage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const athleteId = resolvedParams.id;
  const router = useRouter();

  const [athleteRows, setAthleteRows] = React.useState<GenericRow[]>([]);
  const [attendanceRows, setAttendanceRows] = React.useState<GenericRow[]>([]);
  const [performanceRows, setPerformanceRows] = React.useState<GenericRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [isEditingAthlete, setIsEditingAthlete] = React.useState(false);
  const [athleteNameInput, setAthleteNameInput] = React.useState('');
  const [athleteTeamInput, setAthleteTeamInput] = React.useState('');
  const [athleteSportInput, setAthleteSportInput] = React.useState('');
  const [athleteAgeGroupInput, setAthleteAgeGroupInput] = React.useState('');
  const [savingAthlete, setSavingAthlete] = React.useState(false);
  const [quickAttendanceDate, setQuickAttendanceDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [quickAttendanceSessionType, setQuickAttendanceSessionType] = React.useState('Training');
  const [quickAttendanceStatus, setQuickAttendanceStatus] = React.useState('Present');
  const [savingQuickAttendance, setSavingQuickAttendance] = React.useState(false);
  const [quickPerformanceDate, setQuickPerformanceDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [quickPerformanceTestType, setQuickPerformanceTestType] = React.useState('');
  const [quickPerformanceResult, setQuickPerformanceResult] = React.useState('');
  const [quickPerformanceUnit, setQuickPerformanceUnit] = React.useState('');
  const [quickPerformanceNotes, setQuickPerformanceNotes] = React.useState('');
  const [savingQuickPerformance, setSavingQuickPerformance] = React.useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = React.useState<string | null>(null);
  const [editAttendanceDate, setEditAttendanceDate] = React.useState('');
  const [editAttendanceSessionType, setEditAttendanceSessionType] = React.useState('Training');
  const [editAttendanceStatus, setEditAttendanceStatus] = React.useState('Present');
  const [savingAttendanceEdit, setSavingAttendanceEdit] = React.useState(false);
  const [editingPerformanceId, setEditingPerformanceId] = React.useState<string | null>(null);
  const [editPerformanceDate, setEditPerformanceDate] = React.useState('');
  const [editPerformanceTestType, setEditPerformanceTestType] = React.useState('');
  const [editPerformanceResult, setEditPerformanceResult] = React.useState('');
  const [editPerformanceUnit, setEditPerformanceUnit] = React.useState('');
  const [editPerformanceNotes, setEditPerformanceNotes] = React.useState('');
  const [savingPerformanceEdit, setSavingPerformanceEdit] = React.useState(false);

  // Coach notes
  const [notes, setNotes] = React.useState<GenericRow[]>([]);
  const [newNote, setNewNote] = React.useState('');
  const [savingNote, setSavingNote] = React.useState(false);

  React.useEffect(() => { if (!successMessage) return; const t = setTimeout(() => setSuccessMessage(''), 3000); return () => clearTimeout(t); }, [successMessage]);

  async function loadPageData() {
    setLoading(true);
    const [athRes, attRes, perfRes, notesRes] = await Promise.all([
      supabase.from('athletes').select('*'),
      supabase.from('Attendance').select('*').eq('athlete_id', athleteId).order('session_date', { ascending: false }),
      supabase.from('Performance').select('*').eq('athlete_id', athleteId).order('test_date', { ascending: false }),
      supabase.from('CoachNotes').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
    ]);
    if (athRes.error) { setError(athRes.error.message); setLoading(false); return; }
    setAthleteRows((athRes.data as GenericRow[]) || []);
    setAttendanceRows((attRes.data as GenericRow[]) || []);
    setPerformanceRows((perfRes.data as GenericRow[]) || []);
    setNotes((notesRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  React.useEffect(() => { loadPageData(); }, [athleteId]);

  const athletes = React.useMemo(() => athleteRows.map(normalizeAthlete), [athleteRows]);
  const athlete = React.useMemo(() => athletes.find((a) => String(a.id) === String(athleteId)) || null, [athletes, athleteId]);
  const athleteIndex = React.useMemo(() => athletes.findIndex((a) => String(a.id) === String(athleteId)), [athletes, athleteId]);
  const previousAthlete = athleteIndex > 0 ? athletes[athleteIndex - 1] : null;
  const nextAthlete = athleteIndex >= 0 && athleteIndex < athletes.length - 1 ? athletes[athleteIndex + 1] : null;
  const attendanceRecords = React.useMemo(() => attendanceRows.map(normalizeAttendance).sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()), [attendanceRows]);
  const performanceRecords = React.useMemo(() => performanceRows.map(normalizePerformance).sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()), [performanceRows]);

  React.useEffect(() => { if (!athlete) return; setAthleteNameInput(athlete.name); setAthleteTeamInput(athlete.team); setAthleteSportInput(athlete.sport === '—' ? '' : athlete.sport); setAthleteAgeGroupInput(athlete.ageGroup === '—' ? '' : athlete.ageGroup); }, [athlete]);

  const attendanceSummary = React.useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status.toLowerCase() === 'present').length;
    const late = attendanceRecords.filter((r) => r.status.toLowerCase() === 'late').length;
    const absent = attendanceRecords.filter((r) => r.status.toLowerCase() === 'absent').length;
    const excused = attendanceRecords.filter((r) => r.status.toLowerCase() === 'excused').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : null;
    return { total, present, late, absent, excused, rate };
  }, [attendanceRecords]);

  const performanceTrends = React.useMemo(() => {
    const grouped = new Map<string, PerformanceRecord[]>();
    performanceRecords.forEach((r) => { if (!grouped.has(r.test_type)) grouped.set(r.test_type, []); grouped.get(r.test_type)!.push(r); });
    const rows: { testType: string; latest: number | null; previous: number | null; delta: number | null; unit: string; latestDate: string }[] = [];
    grouped.forEach((entries, testType) => {
      const sorted = [...entries].filter((e) => e.result !== null).sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
      if (!sorted.length) return;
      const latest = sorted[0]; const prev = sorted[1];
      rows.push({ testType, latest: latest.result, previous: prev ? prev.result : null, delta: latest.result !== null && prev?.result !== null && prev ? latest.result - prev.result : null, unit: latest.unit, latestDate: latest.test_date });
    });
    return rows;
  }, [performanceRecords]);

  async function handleSaveAthleteProfile() {
    if (!athlete || !athleteNameInput.trim()) { setError('Name is required.'); return; }
    setSavingAthlete(true);
    const payload = buildAthleteUpdatePayload(athlete.raw, { name: athleteNameInput.trim(), team: athleteTeamInput.trim(), sport: athleteSportInput.trim(), ageGroup: athleteAgeGroupInput.trim() });
    const { error: err } = await supabase.from('athletes').update(payload).eq('id', athlete.id);
    if (err) { setError(err.message); setSavingAthlete(false); return; }
    setSuccessMessage('Profile updated.'); setIsEditingAthlete(false); await loadPageData(); setSavingAthlete(false);
  }
  async function handleDeleteAthlete() {
    if (!athlete || !confirm(`Delete ${athlete.name}? This cannot be undone.`)) return;
    const { error: err } = await supabase.from('athletes').delete().eq('id', athlete.id);
    if (err) { setError(err.message); return; }
    router.push('/athletes');
  }
  async function handleQuickAddAttendance(e: React.FormEvent) {
    e.preventDefault(); if (!athlete || !quickAttendanceDate) { setError('Date required.'); return; }
    setSavingQuickAttendance(true);
    const { error: err } = await supabase.from('Attendance').insert([{ athlete_id: athlete.id, session_date: quickAttendanceDate, session_type: quickAttendanceSessionType, status: quickAttendanceStatus }]);
    if (err) { setError(err.message); setSavingQuickAttendance(false); return; }
    setSuccessMessage('Attendance added.'); await loadPageData(); setSavingQuickAttendance(false);
  }
  async function handleQuickAddPerformance(e: React.FormEvent) {
    e.preventDefault(); if (!athlete || !quickPerformanceTestType.trim()) { setError('Test type required.'); return; }
    const num = Number(quickPerformanceResult); if (quickPerformanceResult === '' || Number.isNaN(num)) { setError('Result must be a number.'); return; }
    setSavingQuickPerformance(true);
    const { error: err } = await supabase.from('Performance').insert([{ athlete_id: athlete.id, test_date: quickPerformanceDate, test_type: quickPerformanceTestType.trim(), result: num, unit: quickPerformanceUnit.trim(), notes: quickPerformanceNotes.trim() }]);
    if (err) { setError(err.message); setSavingQuickPerformance(false); return; }
    setSuccessMessage('Result added.'); setQuickPerformanceTestType(''); setQuickPerformanceResult(''); setQuickPerformanceUnit(''); setQuickPerformanceNotes(''); await loadPageData(); setSavingQuickPerformance(false);
  }
  function startAttendanceEdit(r: AttendanceRecord) { setEditingAttendanceId(r.id); setEditAttendanceDate(r.session_date); setEditAttendanceSessionType(r.session_type || 'Training'); setEditAttendanceStatus(formatStatus(r.status) || 'Present'); }
  function cancelAttendanceEdit() { setEditingAttendanceId(null); setEditAttendanceDate(''); setEditAttendanceSessionType('Training'); setEditAttendanceStatus('Present'); }
  async function handleSaveAttendanceEdit(id: string) {
    setSavingAttendanceEdit(true);
    const { error: err } = await supabase.from('Attendance').update({ session_date: editAttendanceDate, session_type: editAttendanceSessionType, status: editAttendanceStatus }).eq('id', id);
    if (err) { setError(err.message); setSavingAttendanceEdit(false); return; }
    setSuccessMessage('Updated.'); cancelAttendanceEdit(); await loadPageData(); setSavingAttendanceEdit(false);
  }
  async function handleDeleteAttendance(id: string) { if (!confirm('Delete this record?')) return; await supabase.from('Attendance').delete().eq('id', id); setSuccessMessage('Deleted.'); await loadPageData(); }
  function startPerformanceEdit(r: PerformanceRecord) { setEditingPerformanceId(r.id); setEditPerformanceDate(r.test_date); setEditPerformanceTestType(r.test_type); setEditPerformanceResult(r.result !== null ? String(r.result) : ''); setEditPerformanceUnit(r.unit); setEditPerformanceNotes(r.notes); }
  function cancelPerformanceEdit() { setEditingPerformanceId(null); setEditPerformanceDate(''); setEditPerformanceTestType(''); setEditPerformanceResult(''); setEditPerformanceUnit(''); setEditPerformanceNotes(''); }
  async function handleSavePerformanceEdit(id: string) {
    if (!editPerformanceTestType.trim()) { setError('Test type required.'); return; }
    const num = Number(editPerformanceResult); if (editPerformanceResult === '' || Number.isNaN(num)) { setError('Result must be a number.'); return; }
    setSavingPerformanceEdit(true);
    const { error: err } = await supabase.from('Performance').update({ test_date: editPerformanceDate, test_type: editPerformanceTestType.trim(), result: num, unit: editPerformanceUnit.trim(), notes: editPerformanceNotes.trim() }).eq('id', id);
    if (err) { setError(err.message); setSavingPerformanceEdit(false); return; }
    setSuccessMessage('Updated.'); cancelPerformanceEdit(); await loadPageData(); setSavingPerformanceEdit(false);
  }
  async function handleDeletePerformance(id: string) { if (!confirm('Delete this record?')) return; await supabase.from('Performance').delete().eq('id', id); setSuccessMessage('Deleted.'); await loadPageData(); }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!athlete || !newNote.trim()) return;
    setSavingNote(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error: err } = await supabase.from('CoachNotes').insert([{
      athlete_id: athlete.id,
      note: newNote.trim(),
      created_by: session?.user?.email || 'Coach',
    }]);
    if (err) { setError(err.message); setSavingNote(false); return; }
    setNewNote('');
    setSuccessMessage('Note saved.');
    await loadPageData();
    setSavingNote(false);
  }

  async function handleDeleteNote(id: string) {
    if (!confirm('Delete this note?')) return;
    await supabase.from('CoachNotes').delete().eq('id', id);
    setSuccessMessage('Note deleted.');
    await loadPageData();
  }

  if (loading) return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading profile...</p>
        </div>
      </div>
    </main>
  );

  if (!athlete) return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-lg font-black text-white">Athlete not found</p>
          <Link href="/athletes" className="mt-4 inline-block text-sm text-sky-400 hover:text-sky-300">Back to Athletes</Link>
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/athletes" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300">← Athletes</Link>

        {/* Profile header */}
        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-2xl font-black text-sky-400">{initials(athlete.name)}</div>
            <div className="flex-1">
              {isEditingAthlete ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={athleteNameInput} onChange={(e) => setAthleteNameInput(e.target.value)} placeholder="Full name" className="col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
                    <input value={athleteTeamInput} onChange={(e) => setAthleteTeamInput(e.target.value)} placeholder="Team" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
                    <input value={athleteAgeGroupInput} onChange={(e) => setAthleteAgeGroupInput(e.target.value)} placeholder="Age group" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveAthleteProfile} disabled={savingAthlete} className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-black text-sky-300 disabled:opacity-50">{savingAthlete ? 'Saving...' : 'Save'}</button>
                    <button onClick={() => setIsEditingAthlete(false)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300">Cancel</button>
                    <button onClick={handleDeleteAthlete} className="ml-auto rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">Delete</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-white sm:text-3xl">{athlete.name}</h1>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">{athlete.team}</span>
                        {athlete.ageGroup !== '—' && <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-400">{athlete.ageGroup}</span>}
                      </div>
                    </div>
                    <button onClick={() => setIsEditingAthlete(true)} className="shrink-0 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">Edit</button>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-5 border-t border-slate-800 pt-4">
                    <div><p className={`text-2xl font-black ${attendanceSummary.rate === null ? 'text-slate-500' : attendanceSummary.rate >= 80 ? 'text-emerald-400' : attendanceSummary.rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{attendanceSummary.rate !== null ? `${attendanceSummary.rate}%` : '—'}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Attendance</p></div>
                    <div className="w-px bg-slate-800" />
                    <div><p className="text-2xl font-black text-white">{attendanceSummary.total}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sessions</p></div>
                    <div className="w-px bg-slate-800" />
                    <div><p className="text-2xl font-black text-red-400">{attendanceSummary.absent}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Absences</p></div>
                    <div className="w-px bg-slate-800" />
                    <div><p className="text-2xl font-black text-violet-400">{performanceRecords.length}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Test Records</p></div>
                  </div>
                  {(previousAthlete || nextAthlete) && (
                    <div className="mt-3 flex gap-2">
                      {previousAthlete && <Link href={`/athletes/${previousAthlete.id}`} className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white">← {previousAthlete.name}</Link>}
                      {nextAthlete && <Link href={`/athletes/${nextAthlete.id}`} className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white">{nextAthlete.name} →</Link>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {successMessage && <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{successMessage}</div>}

        <div className="space-y-6">

          {/* Performance Trends */}
          {performanceTrends.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Progress</p><h2 className="mt-0.5 text-lg font-black text-white">Performance Trends</h2></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {performanceTrends.map((trend) => (
                  <div key={trend.testType} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{trend.testType}</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <p className="text-2xl font-black text-white">{formatResult(trend.latest, trend.unit)}</p>
                      {trend.delta !== null && <span className={`mb-0.5 rounded-full px-2.5 py-1 text-xs font-black ${trend.delta > 0 ? 'bg-emerald-500/15 text-emerald-300' : trend.delta < 0 ? 'bg-red-500/15 text-red-300' : 'bg-slate-800 text-slate-400'}`}>{trend.delta > 0 ? `↑ +${trend.delta}` : trend.delta < 0 ? `↓ ${trend.delta}` : '→ 0'}{trend.unit ? ` ${trend.unit}` : ''}</span>}
                    </div>
                    {trend.previous !== null && <p className="mt-1 text-[11px] text-slate-600">Prev: {formatResult(trend.previous, trend.unit)}</p>}
                    <p className="mt-1 text-[10px] text-slate-600">{formatDate(trend.latestDate)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Sessions</p><h2 className="mt-0.5 text-lg font-black text-white">Attendance History</h2></div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-400">{attendanceSummary.present} Present</span>
                <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-bold text-red-400">{attendanceSummary.absent} Absent</span>
              </div>
            </div>
            <form onSubmit={handleQuickAddAttendance} className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <select value={quickAttendanceStatus} onChange={(e) => setQuickAttendanceStatus(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500">{['Present','Absent','Late','Excused'].map((s) => <option key={s}>{s}</option>)}</select>
              <select value={quickAttendanceSessionType} onChange={(e) => setQuickAttendanceSessionType(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500">{['Training','Match','Gym','Recovery','Testing'].map((s) => <option key={s}>{s}</option>)}</select>
              <input type="date" value={quickAttendanceDate} onChange={(e) => setQuickAttendanceDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
              <button type="submit" disabled={savingQuickAttendance} className="rounded-xl border border-emerald-500 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-300 disabled:opacity-50">{savingQuickAttendance ? '...' : 'Add'}</button>
            </form>
            {attendanceRecords.length === 0 ? <p className="text-sm text-slate-500">No attendance records yet.</p> : (
              <div className="space-y-2">
                {attendanceRecords.slice(0, 30).map((record) => {
                  const isEditing = editingAttendanceId === record.id;
                  return (
                    <div key={record.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <select value={editAttendanceStatus} onChange={(e) => setEditAttendanceStatus(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500">{['Present','Absent','Late','Excused'].map((s) => <option key={s}>{s}</option>)}</select>
                          <select value={editAttendanceSessionType} onChange={(e) => setEditAttendanceSessionType(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500">{['Training','Match','Gym','Recovery','Testing'].map((s) => <option key={s}>{s}</option>)}</select>
                          <input type="date" value={editAttendanceDate} onChange={(e) => setEditAttendanceDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                          <button onClick={() => handleSaveAttendanceEdit(record.id)} disabled={savingAttendanceEdit} className="rounded-xl border border-sky-500 bg-sky-500/15 px-3 py-2 text-sm font-black text-sky-300 disabled:opacity-50">{savingAttendanceEdit ? '...' : 'Save'}</button>
                          <button onClick={cancelAttendanceEdit} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${getStatusClasses(record.status)}`}>{formatStatus(record.status)}</span>
                          <div className="min-w-0 flex-1"><p className="text-sm text-slate-300">{record.session_type}</p><p className="text-xs text-slate-500">{formatDate(record.session_date)}</p></div>
                          <div className="flex gap-1.5">
                            <button onClick={() => startAttendanceEdit(record)} className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:text-white">Edit</button>
                            <button onClick={() => handleDeleteAttendance(record.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {attendanceRecords.length > 30 && <p className="text-center text-xs text-slate-600">Showing 30 of {attendanceRecords.length}</p>}
              </div>
            )}
          </div>

          {/* Performance */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Testing</p><h2 className="mt-0.5 text-lg font-black text-white">Performance Records</h2></div>
            <form onSubmit={handleQuickAddPerformance} className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <input value={quickPerformanceTestType} onChange={(e) => setQuickPerformanceTestType(e.target.value)} list="perf-tests" placeholder="Test type" className="flex-1 min-w-28 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500" />
              <datalist id="perf-tests">{['SBJ','10m Sprint','30m Sprint','505 Left','505 Right','Push-Ups','Pull-Ups','Yo-Yo IR1','RSA Sdec%'].map((t) => <option key={t} value={t} />)}</datalist>
              <input type="number" step="any" value={quickPerformanceResult} onChange={(e) => setQuickPerformanceResult(e.target.value)} placeholder="Result" className="w-24 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
              <input value={quickPerformanceUnit} onChange={(e) => setQuickPerformanceUnit(e.target.value)} placeholder="Unit" className="w-20 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
              <input type="date" value={quickPerformanceDate} onChange={(e) => setQuickPerformanceDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
              <button type="submit" disabled={savingQuickPerformance} className="rounded-xl border border-violet-500 bg-violet-500/15 px-4 py-2 text-sm font-black text-violet-300 disabled:opacity-50">{savingQuickPerformance ? '...' : 'Add'}</button>
            </form>
            {performanceRecords.length === 0 ? <p className="text-sm text-slate-500">No performance records yet.</p> : (
              <div className="space-y-2">
                {performanceRecords.map((record) => {
                  const isEditing = editingPerformanceId === record.id;
                  return (
                    <div key={record.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <input value={editPerformanceTestType} onChange={(e) => setEditPerformanceTestType(e.target.value)} placeholder="Test type" className="flex-1 min-w-28 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                            <input type="number" step="any" value={editPerformanceResult} onChange={(e) => setEditPerformanceResult(e.target.value)} placeholder="Result" className="w-24 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                            <input value={editPerformanceUnit} onChange={(e) => setEditPerformanceUnit(e.target.value)} placeholder="Unit" className="w-20 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                            <input type="date" value={editPerformanceDate} onChange={(e) => setEditPerformanceDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleSavePerformanceEdit(record.id)} disabled={savingPerformanceEdit} className="rounded-xl border border-sky-500 bg-sky-500/15 px-3 py-2 text-sm font-black text-sky-300 disabled:opacity-50">{savingPerformanceEdit ? '...' : 'Save'}</button>
                            <button onClick={cancelPerformanceEdit} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="shrink-0 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-black text-violet-300">{record.test_type}</span>
                          <p className="flex-1 text-sm font-bold text-white">{formatResult(record.result, record.unit)}</p>
                          <p className="shrink-0 text-xs text-slate-500">{formatDate(record.test_date)}</p>
                          <div className="flex gap-1.5">
                            <button onClick={() => startPerformanceEdit(record)} className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:text-white">Edit</button>
                            <button onClick={() => handleDeletePerformance(record.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Coach Notes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Coaching</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Coach Notes</h2>
            </div>

            {/* Add note */}
            <form onSubmit={handleAddNote} className="mb-5">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this player — selection thoughts, injury concerns, training observations..."
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={savingNote || !newNote.trim()}
                className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-black text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {savingNote ? 'Saving...' : 'Save Note'}
              </button>
            </form>

            {/* Notes list */}
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-sm leading-relaxed text-slate-200">{note.note}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] text-slate-600">
                          {note.created_by && <span className="text-slate-500">{note.created_by} · </span>}
                          {note.created_at ? new Date(note.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}