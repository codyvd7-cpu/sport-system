'use client';

import Link from 'next/link';
import * as React from 'react';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeUUID } from '@/lib/uuid';
import { PerformanceTrendChart, AttendanceChart } from '@/components/AthleteCharts';

// ── TYPES ─────────────────────────────────────────────────────
type GenericRow = Record<string, any>;
type PageProps = { params: Promise<{ id: string }> };
type Athlete = { id: string; name: string; team: string; sport: string; ageGroup: string; raw: GenericRow };
type AttendanceRecord = { id: string; athlete_id: string; session_date: string; session_type: string; status: string; created_at: string | null; raw: GenericRow };
type PerformanceRecord = { id: string; athlete_id: string; test_date: string; test_type: string; value: number | null; unit: string; notes: string; created_at: string | null; raw: GenericRow };

// ── UTILITIES ─────────────────────────────────────────────────
function firstString(...values: any[]) { for (const v of values) { if (typeof v === 'string' && v.trim() !== '') return v.trim(); } return ''; }
function firstValue(...values: any[]) { for (const v of values) { if (v !== null && v !== undefined && v !== '') return String(v); } return ''; }
function firstNumber(...values: any[]) { for (const v of values) { if (v === null || v === undefined || v === '') continue; const n = Number(v); if (!Number.isNaN(n)) return n; } return null; }
function formatDate(d?: string | null) { if (!d) return '—'; const date = new Date(d); if (Number.isNaN(date.getTime())) return '—'; return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatStatus(s: string) { const c = (s || '').toLowerCase(); if (!c) return '—'; return c.charAt(0).toUpperCase() + c.slice(1); }
function getStatusClasses(s: string) { const c = (s || '').toLowerCase(); if (c === 'present') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'; if (c === 'late') return 'bg-amber-500/15 text-amber-300 border border-amber-500/20'; if (c === 'absent') return 'bg-red-500/15 text-red-300 border border-red-500/20'; if (c === 'excused') return 'bg-sky-500/15 text-sky-300 border border-sky-500/20'; return 'bg-slate-800 text-slate-300 border border-slate-700'; }
function formatResult(result: number | null, unit: string) { if (result === null || Number.isNaN(result as number)) return '—'; return `${result}${unit ? ` ${unit}` : ''}`; }
function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(); }

function normalizeAthlete(row: GenericRow): Athlete {
  return {
    id: firstValue(row.id, row.athlete_id, safeUUID()),
    name: firstString(row.name, row.full_name, row.athlete_name, row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : '', row.first_name) || 'Unknown',
    team: firstString(row.team, row.team_name) || 'Unassigned',
    sport: firstString(row.sport) || '—',
    ageGroup: firstString(row.age_group, row.agegroup) || '—',
    raw: row,
  };
}
function normalizeAttendance(row: GenericRow): AttendanceRecord {
  return { id: firstValue(row.id, safeUUID()), athlete_id: firstValue(row.athlete_id), session_date: firstString(row.session_date), session_type: firstString(row.session_type) || '—', status: firstString(row.status) || '—', created_at: firstString(row.created_at) || null, raw: row };
}
function normalizePerformance(row: GenericRow): PerformanceRecord {
  return { id: firstValue(row.id, safeUUID()), athlete_id: firstValue(row.athlete_id), test_date: firstString(row.test_date), test_type: firstString(row.test_type) || '—', value: firstNumber(row.value), unit: firstString(row.unit) || '', notes: firstString(row.notes) || '', created_at: firstString(row.created_at) || null, raw: row };
}
function buildAthleteUpdatePayload(raw: GenericRow, input: { name: string; team: string; sport: string; ageGroup: string }) {
  const p: GenericRow = {};
  if ('name' in raw) p.name = input.name; else if ('full_name' in raw) p.full_name = input.name;
  if ('team' in raw) p.team = input.team;
  if ('age_group' in raw) p.age_group = input.ageGroup; else if ('agegroup' in raw) p.agegroup = input.ageGroup;
  return p;
}

// ── CONSTANTS ─────────────────────────────────────────────────
const LOWER_IS_BETTER = ['Bronco', '10m Sprint', '30m Sprint', '505', 'RSA'];
const BENCHMARKS: Record<string, { u1415: number[]; u1618: number[] }> = {
  'SBJ':        { u1415: [195,175,155,135], u1618: [215,195,175,155] },
  '10m Sprint': { u1415: [1.72,1.82,1.92,2.02], u1618: [1.65,1.75,1.85,1.95] },
  '30m Sprint': { u1415: [4.25,4.45,4.65,4.85], u1618: [4.05,4.25,4.45,4.65] },
  '505 Left':   { u1415: [2.35,2.50,2.65,2.80], u1618: [2.25,2.40,2.55,2.70] },
  '505 Right':  { u1415: [2.35,2.50,2.65,2.80], u1618: [2.25,2.40,2.55,2.70] },
  'Push-Ups':   { u1415: [40,30,20,10], u1618: [50,38,26,14] },
  'Pull-Ups':   { u1415: [10,7,4,1], u1618: [10,7,4,1] },
  'Yo-Yo IR1':  { u1415: [1200,900,700,500], u1618: [1600,1200,900,600] },
  'RSA Sdec%':  { u1415: [3.0,5.0,7.0,10.0], u1618: [2.5,4.0,6.0,9.0] },
};
const TEST_DESCRIPTIONS: Record<string, string> = {
  'SBJ': 'Lower body explosive power',
  '10m Sprint': 'Acceleration speed',
  '30m Sprint': 'Maximum speed',
  '505 Left': 'Change of direction (left)',
  '505 Right': 'Change of direction (right)',
  'Push-Ups': 'Upper body muscular endurance',
  'Pull-Ups': 'Upper body pulling strength',
  'Yo-Yo IR1': 'Aerobic fitness',
  'RSA Sdec%': 'Fatigue resistance under repeated sprints',
  'Bronco': 'Aerobic capacity and running fitness',
};
const TIERS = [
  { label: 'Elite',      color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
  { label: 'Good',       color: 'text-sky-300',     bg: 'bg-sky-500/20',     border: 'border-sky-500/40' },
  { label: 'Average',    color: 'text-amber-300',   bg: 'bg-amber-500/20',   border: 'border-amber-500/40' },
  { label: 'Developing', color: 'text-orange-300',  bg: 'bg-orange-500/20',  border: 'border-orange-500/40' },
  { label: 'Poor',       color: 'text-red-300',     bg: 'bg-red-500/20',     border: 'border-red-500/40' },
];

function getBenchmarkTier(testKey: string, value: number, ag: string) {
  const b = BENCHMARKS[testKey]; if (!b) return null;
  const lower = LOWER_IS_BETTER.some((t) => testKey.toLowerCase().includes(t.toLowerCase()));
  const t = ag.includes('14') || ag.includes('15') ? b.u1415 : b.u1618;
  if (lower) { if (value < t[0]) return TIERS[0]; if (value < t[1]) return TIERS[1]; if (value < t[2]) return TIERS[2]; if (value < t[3]) return TIERS[3]; return TIERS[4]; }
  else { if (value > t[0]) return TIERS[0]; if (value > t[1]) return TIERS[1]; if (value > t[2]) return TIERS[2]; if (value > t[3]) return TIERS[3]; return TIERS[4]; }
}

// ── SUB-COMPONENTS ────────────────────────────────────────────
function AttendanceRing({ rate }: { rate: number | null }) {
  const r = 36; const circ = 2 * Math.PI * r;
  const pct = rate ?? 0;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="text-center">
        <p className="text-lg font-black text-white leading-none">{rate !== null ? `${rate}%` : '—'}</p>
        <p className="text-[9px] text-slate-500 uppercase tracking-wide">Att.</p>
      </div>
    </div>
  );
}

function Sparkline({ values, lower }: { values: number[]; lower: boolean }) {
  if (values.length < 2) return <div className="h-8 flex items-center"><p className="text-[9px] text-slate-600">—</p></div>;
  const min = Math.min(...values); const max = Math.max(...values);
  const range = max - min || 1;
  const W = 80; const H = 28;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ');
  const last = values[values.length - 1]; const first = values[0];
  const improved = lower ? last < first : last > first;
  const color = improved ? '#10b981' : '#ef4444';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-7" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function AthleteProfilePage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const athleteId = resolvedParams.id;
  const router = useRouter();
  const { showToast } = useToast();

  // ── STATE ────────────────────────────────────────────────────
  const [athleteRows, setAthleteRows] = React.useState<GenericRow[]>([]);
  const [attendanceRows, setAttendanceRows] = React.useState<GenericRow[]>([]);
  const [performanceRows, setPerformanceRows] = React.useState<GenericRow[]>([]);
  const [notes, setNotes] = React.useState<GenericRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Edit athlete
  const [isEditingAthlete, setIsEditingAthlete] = React.useState(false);
  const [athleteNameInput, setAthleteNameInput] = React.useState('');
  const [athleteTeamInput, setAthleteTeamInput] = React.useState('');
  const [athleteSportInput, setAthleteSportInput] = React.useState('');
  const [athleteAgeGroupInput, setAthleteAgeGroupInput] = React.useState('');
  const [savingAthlete, setSavingAthlete] = React.useState(false);

  // Availability + position
  const [availability, setAvailability] = React.useState('Available');
  const [savingAvailability, setSavingAvailability] = React.useState(false);
  const [positionInput, setPositionInput] = React.useState('');
  const [editingPosition, setEditingPosition] = React.useState(false);

  // Player code
  const [generatingCode, setGeneratingCode] = React.useState(false);

  // Attendance quick add
  const [quickAttendanceDate, setQuickAttendanceDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [quickAttendanceSessionType, setQuickAttendanceSessionType] = React.useState('Training');
  const [quickAttendanceStatus, setQuickAttendanceStatus] = React.useState('Present');
  const [savingQuickAttendance, setSavingQuickAttendance] = React.useState(false);

  // Attendance edit
  const [editingAttendanceId, setEditingAttendanceId] = React.useState<string | null>(null);
  const [editAttendanceDate, setEditAttendanceDate] = React.useState('');
  const [editAttendanceSessionType, setEditAttendanceSessionType] = React.useState('Training');
  const [editAttendanceStatus, setEditAttendanceStatus] = React.useState('Present');
  const [savingAttendanceEdit, setSavingAttendanceEdit] = React.useState(false);

  // Performance quick add
  const [quickPerformanceDate, setQuickPerformanceDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [quickPerformanceTestType, setQuickPerformanceTestType] = React.useState('');
  const [quickPerformanceResult, setQuickPerformanceResult] = React.useState('');
  const [quickPerformanceUnit, setQuickPerformanceUnit] = React.useState('');
  const [quickPerformanceNotes, setQuickPerformanceNotes] = React.useState('');
  const [savingQuickPerformance, setSavingQuickPerformance] = React.useState(false);

  // Performance edit
  const [editingPerformanceId, setEditingPerformanceId] = React.useState<string | null>(null);
  const [editPerformanceDate, setEditPerformanceDate] = React.useState('');
  const [editPerformanceTestType, setEditPerformanceTestType] = React.useState('');
  const [editPerformanceResult, setEditPerformanceResult] = React.useState('');
  const [editPerformanceUnit, setEditPerformanceUnit] = React.useState('');
  const [editPerformanceNotes, setEditPerformanceNotes] = React.useState('');
  const [savingPerformanceEdit, setSavingPerformanceEdit] = React.useState(false);

  // Notes
  const [newNote, setNewNote] = React.useState('');
  const [savingNote, setSavingNote] = React.useState(false);

  // Structured feedback
  const [editingFeedback, setEditingFeedback] = React.useState(false);
  const [fbStrengths, setFbStrengths] = React.useState('');
  const [fbFocus, setFbFocus] = React.useState('');
  const [fbComment, setFbComment] = React.useState('');
  const [savingFeedback, setSavingFeedback] = React.useState(false);

  // ── EFFECTS ──────────────────────────────────────────────────

  async function loadPageData() {
    setLoading(true);
    const [athRes, attRes, perfRes, notesRes] = await Promise.all([
      supabase.from('athletes').select('*'),
      supabase.from('attendance').select('*').eq('athlete_id', athleteId).order('session_date', { ascending: false }).limit(100),
      supabase.from('performance_tests').select('*').eq('athlete_id', athleteId).order('test_date', { ascending: false }).limit(100),
      supabase.from('coach_notes').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
    ]);
    if (athRes.error) { setError(athRes.error.message); setLoading(false); return; }
    setAthleteRows((athRes.data as GenericRow[]) || []);
    setAttendanceRows((attRes.data as GenericRow[]) || []);
    setPerformanceRows((perfRes.data as GenericRow[]) || []);
    setNotes((notesRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  React.useEffect(() => { loadPageData(); }, [athleteId]);

  // ── MEMOS ────────────────────────────────────────────────────
  const athletes = React.useMemo(() => athleteRows.map(normalizeAthlete), [athleteRows]);
  const athlete = React.useMemo(() => athletes.find((a) => String(a.id) === String(athleteId)) || null, [athletes, athleteId]);
  const athleteIndex = React.useMemo(() => athletes.findIndex((a) => String(a.id) === String(athleteId)), [athletes, athleteId]);
  const previousAthlete = athleteIndex > 0 ? athletes[athleteIndex - 1] : null;
  const nextAthlete = athleteIndex >= 0 && athleteIndex < athletes.length - 1 ? athletes[athleteIndex + 1] : null;
  const attendanceRecords = React.useMemo(() => attendanceRows.map(normalizeAttendance).sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()), [attendanceRows]);
  const performanceRecords = React.useMemo(() => performanceRows.map(normalizePerformance).sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()), [performanceRows]);

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
      const sorted = [...entries].filter((e) => e.value !== null).sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
      if (!sorted.length) return;
      const latest = sorted[0]; const prev = sorted[1];
      rows.push({ testType, latest: latest.value, previous: prev ? prev.value : null, delta: latest.value !== null && prev?.value !== null && prev ? latest.value - prev.value : null, unit: latest.unit, latestDate: latest.test_date });
    });
    return rows;
  }, [performanceRecords]);

  const personalBests = React.useMemo(() => {
    const grouped = new Map<string, number[]>();
    performanceRecords.forEach((r) => { if (r.value === null) return; if (!grouped.has(r.test_type)) grouped.set(r.test_type, []); grouped.get(r.test_type)!.push(r.value); });
    const pbs: { testType: string; pb: number; unit: string }[] = [];
    grouped.forEach((values, testType) => {
      const lower = LOWER_IS_BETTER.some((t) => testType.toLowerCase().includes(t.toLowerCase()));
      const pb = lower ? Math.min(...values) : Math.max(...values);
      const unit = performanceRecords.find((r) => r.test_type === testType)?.unit || '';
      pbs.push({ testType, pb, unit });
    });
    return pbs;
  }, [performanceRecords]);

  const sparklines = React.useMemo(() => {
    const grouped = new Map<string, number[]>();
    [...performanceRecords].reverse().forEach((r) => { if (r.value === null) return; if (!grouped.has(r.test_type)) grouped.set(r.test_type, []); grouped.get(r.test_type)!.push(r.value); });
    return grouped;
  }, [performanceRecords]);

  const latestFeedback = React.useMemo(() => notes.find((n) => n.is_feedback) || null, [notes]);

  const playerCode = athlete ? firstString(athlete.raw?.player_code) : '';

  // ── POPULATE EDIT STATE ──────────────────────────────────────
  React.useEffect(() => {
    if (!athlete) return;
    setAthleteNameInput(athlete.name);
    setAthleteTeamInput(athlete.team);
    setAthleteSportInput(athlete.sport === '—' ? '' : athlete.sport);
    setAthleteAgeGroupInput(athlete.ageGroup === '—' ? '' : athlete.ageGroup);
    setAvailability(athlete.raw?.availability || 'Available');
    setPositionInput(athlete.raw?.position || '');
  }, [athlete]);

  // ── HANDLERS ─────────────────────────────────────────────────
  async function handleSaveAthleteProfile() {
    if (!athlete || !athleteNameInput.trim()) { setError('Name is required.'); return; }
    setSavingAthlete(true);
    const payload = buildAthleteUpdatePayload(athlete.raw, { name: athleteNameInput.trim(), team: athleteTeamInput.trim(), sport: athleteSportInput.trim(), ageGroup: athleteAgeGroupInput.trim() });
    const { error: err } = await supabase.from('athletes').update(payload).eq('id', athlete.id);
    if (err) { setError(err.message); setSavingAthlete(false); return; }
    showToast('Profile updated'); setIsEditingAthlete(false); await loadPageData(); setSavingAthlete(false);
  }
  async function handleDeleteAthlete() {
    if (!athlete || !confirm(`Delete ${athlete.name}?`)) return;
    await supabase.from('athletes').delete().eq('id', athlete.id);
    router.push('/athletes');
  }
  async function handleSetAvailability(status: string) {
    if (!athlete) return;
    setSavingAvailability(true);
    await supabase.from('athletes').update({ availability: status }).eq('id', athlete.id);
    setAvailability(status);
    showToast(`Status: ${status}`);
    setSavingAvailability(false);
  }
  async function handleSavePosition() {
    if (!athlete) return;
    await supabase.from('athletes').update({ position: positionInput.trim() }).eq('id', athlete.id);
    setEditingPosition(false);
    showToast('Position saved');
    await loadPageData();
  }
  async function handleGenerateCode() {
    if (!athlete) return;
    setGeneratingCode(true);
    const code = `SBC${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    await supabase.from('athletes').update({ player_code: code }).eq('id', athlete.id);
    showToast(`Access code: ${code}`);
    await loadPageData();
    setGeneratingCode(false);
  }
  async function handleQuickAddAttendance(e: React.FormEvent) {
    e.preventDefault(); if (!athlete) return;
    setSavingQuickAttendance(true);
    const { error: err } = await supabase.from('attendance').insert([{ athlete_id: athlete.id, session_date: quickAttendanceDate, session_type: quickAttendanceSessionType, status: quickAttendanceStatus }]);
    if (err) { setError(err.message); setSavingQuickAttendance(false); return; }
    showToast('Session added'); await loadPageData(); setSavingQuickAttendance(false);
  }
  async function handleQuickAddPerformance(e: React.FormEvent) {
    e.preventDefault(); if (!athlete || !quickPerformanceTestType.trim()) { setError('Test type required.'); return; }
    const num = Number(quickPerformanceResult); if (quickPerformanceResult === '' || Number.isNaN(num)) { setError('Result must be a number.'); return; }
    setSavingQuickPerformance(true);
    const { error: err } = await supabase.from('performance_tests').insert([{ athlete_id: athlete.id, test_date: quickPerformanceDate, test_type: quickPerformanceTestType.trim(), value: num, unit: quickPerformanceUnit.trim(), notes: quickPerformanceNotes.trim() }]);
    if (err) { setError(err.message); setSavingQuickPerformance(false); return; }
    showToast('Session added'); setQuickPerformanceTestType(''); setQuickPerformanceResult(''); setQuickPerformanceUnit(''); await loadPageData(); setSavingQuickPerformance(false);
  }
  function startAttendanceEdit(r: AttendanceRecord) { setEditingAttendanceId(r.id); setEditAttendanceDate(r.session_date); setEditAttendanceSessionType(r.session_type || 'Training'); setEditAttendanceStatus(formatStatus(r.status) || 'Present'); }
  function cancelAttendanceEdit() { setEditingAttendanceId(null); }
  async function handleSaveAttendanceEdit(id: string) {
    setSavingAttendanceEdit(true);
    await supabase.from('attendance').update({ session_date: editAttendanceDate, session_type: editAttendanceSessionType, status: editAttendanceStatus }).eq('id', id);
    showToast('Updated'); cancelAttendanceEdit(); await loadPageData(); setSavingAttendanceEdit(false);
  }
  async function handleDeleteAttendance(id: string) { if (!confirm('Delete?')) return; await supabase.from('attendance').delete().eq('id', id); await loadPageData(); }
  function startPerformanceEdit(r: PerformanceRecord) { setEditingPerformanceId(r.id); setEditPerformanceDate(r.test_date); setEditPerformanceTestType(r.test_type); setEditPerformanceResult(r.value !== null ? String(r.value) : ''); setEditPerformanceUnit(r.unit); setEditPerformanceNotes(r.notes); }
  function cancelPerformanceEdit() { setEditingPerformanceId(null); }
  async function handleSavePerformanceEdit(id: string) {
    const num = Number(editPerformanceResult); if (Number.isNaN(num)) { setError('Result must be a number.'); return; }
    setSavingPerformanceEdit(true);
    await supabase.from('performance_tests').update({ test_date: editPerformanceDate, test_type: editPerformanceTestType.trim(), value: num, unit: editPerformanceUnit.trim(), notes: editPerformanceNotes.trim() }).eq('id', id);
    showToast('Updated'); cancelPerformanceEdit(); await loadPageData(); setSavingPerformanceEdit(false);
  }
  async function handleDeletePerformance(id: string) { if (!confirm('Delete?')) return; await supabase.from('performance_tests').delete().eq('id', id); await loadPageData(); }
  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault(); if (!athlete || !newNote.trim()) return;
    setSavingNote(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('coach_notes').insert([{ athlete_id: athlete.id, note: newNote.trim(), author_email: session?.user?.email || 'Coach', is_feedback: false }]);
    setNewNote(''); showToast('Note saved'); await loadPageData(); setSavingNote(false);
  }
  async function handleDeleteNote(id: string) { if (!confirm('Delete?')) return; await supabase.from('coach_notes').delete().eq('id', id); await loadPageData(); }
  async function handleSaveFeedback() {
    if (!athlete) return;
    setSavingFeedback(true);
    if (latestFeedback) await supabase.from('coach_notes').delete().eq('id', latestFeedback.id);
    await supabase.from('coach_notes').insert([{ athlete_id: athlete.id, note: fbComment, strengths: fbStrengths, current_focus: fbFocus, coach_comment: fbComment, is_feedback: true, author_email: '' }]);
    setEditingFeedback(false); setSavingFeedback(false); showToast('Feedback saved'); await loadPageData();
  }

  // ── EARLY RETURNS ────────────────────────────────────────────
  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading profile...</p>
      </div>
    </main>
  );

  if (!athlete) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <p className="text-lg font-black text-white">Athlete not found</p>
        <Link href="/athletes" className="mt-3 inline-block text-sm text-sky-400">← Back</Link>
      </div>
    </main>
  );

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">

      {/* HERO */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_50%,rgba(14,165,233,0.06),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-8 sm:px-6">

          {/* Nav */}
          <div className="mb-6 flex items-center justify-between">
            <Link href="/athletes" className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition">← Athletes</Link>
            {(previousAthlete || nextAthlete) && (
              <div className="flex gap-2">
                {previousAthlete && <Link href={`/athletes/${previousAthlete.id}`} className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 hover:text-white">← {previousAthlete.name}</Link>}
                {nextAthlete && <Link href={`/athletes/${nextAthlete.id}`} className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 hover:text-white">{nextAthlete.name} →</Link>}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Identity */}
            <div className="flex items-start gap-5">
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/30 to-sky-500/10 text-2xl font-black text-sky-300">{initials(athlete.name)}</div>
                <div className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-950 ${availability === 'Available' ? 'bg-emerald-500' : availability === 'Injured' ? 'bg-red-500' : availability === 'Modified' ? 'bg-amber-500' : 'bg-sky-500'}`}>
                  {availability === 'Available' && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="h-3 w-3"><path d="M5 13l4 4L19 7"/></svg>}
                  {availability !== 'Available' && <span className="text-[8px] font-black text-white">{availability[0]}</span>}
                </div>
              </div>

              <div>
                {isEditingAthlete ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={athleteNameInput} onChange={(e) => setAthleteNameInput(e.target.value)} placeholder="Full name" className="col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                      <input value={athleteTeamInput} onChange={(e) => setAthleteTeamInput(e.target.value)} placeholder="Team" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                      <input value={athleteAgeGroupInput} onChange={(e) => setAthleteAgeGroupInput(e.target.value)} placeholder="Age group" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveAthleteProfile} disabled={savingAthlete} className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-black text-sky-300 disabled:opacity-50">{savingAthlete ? 'Saving...' : 'Save'}</button>
                      <button onClick={() => setIsEditingAthlete(false)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300">Cancel</button>
                      <button onClick={handleDeleteAthlete} className="ml-auto rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">Delete</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">Athlete Profile</p>
                    <h1 className="mt-0.5 text-3xl font-black tracking-tight text-white sm:text-4xl">{athlete.name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-black text-sky-300">{athlete.team}</span>
                      {athlete.ageGroup !== '—' && <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">{athlete.ageGroup}</span>}
                      {editingPosition ? (
                        <div className="flex items-center gap-1.5">
                          <input value={positionInput} onChange={(e) => setPositionInput(e.target.value)} placeholder="e.g. Midfielder" className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-sky-500 w-32" />
                          <button onClick={handleSavePosition} className="rounded-lg border border-sky-500 bg-sky-500/15 px-2 py-1 text-[10px] font-black text-sky-300">Save</button>
                          <button onClick={() => setEditingPosition(false)} className="text-[10px] text-slate-500">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingPosition(true)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${positionInput ? 'bg-violet-500/15 text-violet-300' : 'border border-dashed border-slate-700 text-slate-600 hover:text-slate-400'}`}>{positionInput || '+ Position'}</button>
                      )}
                      {['Available','Injured','Modified','Resting'].map((s) => {
                        const isActive = availability === s;
                        const col = s === 'Available' ? 'emerald' : s === 'Injured' ? 'red' : s === 'Modified' ? 'amber' : 'sky';
                        const active = col === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : col === 'red' ? 'bg-red-500/20 text-red-300 border-red-500/40' : col === 'amber' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-sky-500/20 text-sky-300 border-sky-500/40';
                        return <button key={s} onClick={() => handleSetAvailability(s)} disabled={savingAvailability} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black transition ${isActive ? active : 'border-slate-700 bg-slate-800/40 text-slate-600 hover:text-slate-400'}`}>{s}</button>;
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Attendance ring */}
            {!isEditingAthlete && (
              <div className="flex items-center gap-4 shrink-0">
                <AttendanceRing rate={attendanceSummary.rate} />
                <button onClick={() => setIsEditingAthlete(true)} className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white self-start">Edit</button>
              </div>
            )}
          </div>

          {/* KPIs */}
          {!isEditingAthlete && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Sessions', value: attendanceSummary.total, sub: `${attendanceSummary.present} present`, color: 'sky' },
                { label: 'Absences', value: attendanceSummary.absent, sub: `${attendanceSummary.excused} excused`, color: attendanceSummary.absent > 3 ? 'red' : 'slate' },
                { label: 'Test Records', value: performanceRecords.length, sub: `${performanceTrends.length} test types`, color: 'violet' },
                { label: 'Personal Bests', value: personalBests.length, sub: 'across all tests', color: 'amber' },
              ].map((kpi) => (
                <div key={kpi.label} className={`rounded-2xl border bg-slate-900/80 p-4 ${kpi.color === 'sky' ? 'border-sky-500/20' : kpi.color === 'red' ? 'border-red-500/20' : kpi.color === 'violet' ? 'border-violet-500/20' : kpi.color === 'amber' ? 'border-amber-500/20' : 'border-slate-800'}`}>
                  <p className={`text-3xl font-black ${kpi.color === 'sky' ? 'text-sky-400' : kpi.color === 'red' ? 'text-red-400' : kpi.color === 'violet' ? 'text-violet-400' : kpi.color === 'amber' ? 'text-amber-400' : 'text-white'}`}>{kpi.value}</p>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{kpi.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{kpi.sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        {/* Player Code */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Player Portal</p>
              {playerCode ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="text-2xl font-black tracking-[0.3em] text-white">{playerCode}</p>
                  <button onClick={() => { navigator.clipboard.writeText(playerCode); showToast('Code copied!'); }} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white">Copy Code</button>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/player`); showToast('Link copied!'); }} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white">Copy Link</button>
                </div>
              ) : <p className="mt-1 text-sm text-slate-500">No code yet — player can't access portal.</p>}
            </div>
            <button onClick={handleGenerateCode} disabled={generatingCode} className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black transition disabled:opacity-50 ${playerCode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-sky-500 bg-sky-500/15 text-sky-300 hover:bg-sky-500/20'}`}>
              {generatingCode ? '...' : playerCode ? 'Regenerate' : '🔑 Generate Code'}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {performanceTrends.length === 0 && attendanceRecords.length === 0 && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-4xl mb-3">🏑</p>
            <p className="text-lg font-black text-white">Season hasn't started yet</p>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">Once attendance and testing data is logged, this athlete's full performance profile will appear here.</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-left">
              {[{ icon: '📊', t: 'Attendance', d: 'Every session logged' }, { icon: '⚡', t: 'Benchmark testing', d: 'Sprint, jump, endurance' }, { icon: '📈', t: 'Progress trends', d: 'Track improvement' }].map((item) => (
                <div key={item.t} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-xl mb-1">{item.icon}</p>
                  <p className="text-xs font-black text-white">{item.t}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* LEFT */}
          <div className="space-y-6 xl:col-span-2">

            {/* Coach Feedback */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">From the Coach</p>
                  <h2 className="mt-0.5 text-lg font-black text-white">Latest Feedback</h2>
                </div>
                <button onClick={() => { setEditingFeedback(true); setFbStrengths(latestFeedback?.strengths || ''); setFbFocus(latestFeedback?.current_focus || ''); setFbComment(latestFeedback?.coach_comment || ''); }}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white">
                  {latestFeedback ? 'Update' : '+ Add'}
                </button>
              </div>
              {editingFeedback ? (
                <div className="space-y-3">
                  <div><label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-emerald-400">💪 Strengths</label><textarea value={fbStrengths} onChange={(e) => setFbStrengths(e.target.value)} rows={2} placeholder="e.g. Excellent work ethic..." className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" /></div>
                  <div><label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-amber-400">🎯 Current Focus</label><textarea value={fbFocus} onChange={(e) => setFbFocus(e.target.value)} rows={2} placeholder="e.g. Improve acceleration..." className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500" /></div>
                  <div><label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-sky-400">💬 Coach Comment</label><textarea value={fbComment} onChange={(e) => setFbComment(e.target.value)} rows={2} placeholder="e.g. Has shown great consistency..." className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500" /></div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveFeedback} disabled={savingFeedback} className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-black text-sky-300 disabled:opacity-50">{savingFeedback ? 'Saving...' : 'Save'}</button>
                    <button onClick={() => setEditingFeedback(false)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300">Cancel</button>
                  </div>
                </div>
              ) : latestFeedback ? (
                <div className="space-y-3">
                  {latestFeedback.strengths && <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4"><p className="mb-2 text-[10px] font-black uppercase tracking-wide text-emerald-400">💪 Strengths</p><p className="text-sm leading-relaxed text-slate-200">{latestFeedback.strengths}</p></div>}
                  {latestFeedback.current_focus && <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4"><p className="mb-2 text-[10px] font-black uppercase tracking-wide text-amber-400">🎯 Current Focus</p><p className="text-sm leading-relaxed text-slate-200">{latestFeedback.current_focus}</p></div>}
                  {latestFeedback.coach_comment && <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-4"><p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">💬 Comment</p><p className="text-sm leading-relaxed text-slate-200 italic">"{latestFeedback.coach_comment}"</p></div>}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
                  <p className="text-sm text-slate-500">No feedback added yet.</p>
                  <p className="mt-1 text-xs text-slate-600">Visible to player and parent via their portal.</p>
                </div>
              )}
            </div>

            {/* PBs + Sparklines */}
            {personalBests.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Records</p><h2 className="mt-0.5 text-lg font-black text-white">Personal Bests & Trends</h2></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {personalBests.map((pb) => {
                    const sparkData = sparklines.get(pb.testType) || [];
                    const lower = LOWER_IS_BETTER.some((t) => pb.testType.toLowerCase().includes(t.toLowerCase()));
                    const tier = getBenchmarkTier(pb.testType, pb.pb, athlete.ageGroup);
                    const trend = performanceTrends.find((t) => t.testType === pb.testType);
                    const improved = trend?.delta !== null && trend?.delta !== undefined && (lower ? trend.delta < 0 : trend.delta > 0);
                    return (
                      <div key={pb.testType} className={`rounded-xl border p-4 ${tier ? `${tier.bg} ${tier.border}` : 'border-slate-800 bg-slate-950/50'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{pb.testType}</p>{TEST_DESCRIPTIONS[pb.testType] && <p className="mt-0.5 text-[9px] text-slate-600">{TEST_DESCRIPTIONS[pb.testType]}</p>}</div>
                          {tier && <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.border} ${tier.color}`}>{tier.label}</span>}
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[10px] text-slate-600 uppercase tracking-wide">PB</p>
                            <p className="text-2xl font-black text-white">{pb.pb}{pb.unit}</p>
                            {trend?.delta !== null && trend?.delta !== undefined && <p className={`text-xs font-bold ${improved ? 'text-emerald-400' : 'text-red-400'}`}>{improved ? '↑' : '↓'} {Math.abs(trend.delta)}{pb.unit}</p>}
                          </div>
                          <Sparkline values={sparkData} lower={lower} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Benchmark bars */}
            {performanceTrends.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Fitness Profile</p>
                  <h2 className="mt-0.5 text-lg font-black text-white">Benchmark Position</h2>
                  <p className="mt-1 text-xs text-slate-500">vs St Benedict's standards for {athlete.ageGroup}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{TIERS.map((t) => <span key={t.label} className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${t.bg} ${t.border} ${t.color}`}>{t.label}</span>)}</div>
                </div>
                <div className="space-y-4">
                  {performanceTrends.filter((t) => BENCHMARKS[t.testType] && t.latest !== null).map((trend) => {
                    const tier = getBenchmarkTier(trend.testType, trend.latest!, athlete.ageGroup);
                    const b = BENCHMARKS[trend.testType];
                    const lower = LOWER_IS_BETTER.some((t) => trend.testType.toLowerCase().includes(t.toLowerCase()));
                    const thr = athlete.ageGroup.includes('14') || athlete.ageGroup.includes('15') ? b.u1415 : b.u1618;
                    const pct = lower ? Math.max(0, Math.min(100, ((thr[3] - trend.latest!) / (thr[3] - thr[0])) * 100)) : Math.max(0, Math.min(100, ((trend.latest! - thr[3]) / (thr[0] - thr[3])) * 100));
                    const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-sky-500' : pct >= 40 ? 'bg-amber-500' : pct >= 20 ? 'bg-orange-500' : 'bg-red-500';
                    return (
                      <div key={trend.testType}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300">{trend.testType}</span>
                          <div className="flex items-center gap-2"><span className="text-xs font-black text-white">{trend.latest}{trend.unit}</span>{tier && <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.border} ${tier.color}`}>{tier.label}</span>}</div>
                        </div>
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div className="absolute inset-0 flex">{['bg-red-500/15','bg-orange-500/15','bg-amber-500/15','bg-sky-500/15','bg-emerald-500/15'].map((c,i) => <div key={i} className={`h-full flex-1 ${c}`} />)}</div>
                          <div className={`absolute top-0 h-full rounded-full ${barColor}`} style={{ width: `${Math.max(4, pct)}%` }} />
                        </div>
                        <div className="mt-0.5 flex justify-between text-[9px] text-slate-700"><span>Poor</span><span>Developing</span><span>Average</span><span>Good</span><span>Elite</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {performanceRecords.length >= 2 && <PerformanceTrendChart records={performanceRecords} />}
            {attendanceRecords.length >= 4 && <AttendanceChart records={attendanceRecords} />}

            {/* Internal Notes */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Internal</p><h2 className="mt-0.5 text-lg font-black text-white">Coach Notes <span className="text-sm font-normal text-slate-600">(not visible to player)</span></h2></div>
              <form onSubmit={handleAddNote} className="mb-5">
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Internal notes, selection thoughts, concerns..." rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500" />
                <button type="submit" disabled={savingNote || !newNote.trim()} className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-black text-amber-300 hover:bg-amber-500/20 disabled:opacity-50">{savingNote ? 'Saving...' : 'Save Note'}</button>
              </form>
              {notes.filter((n) => !n.is_feedback).length === 0 ? <p className="text-sm text-slate-500">No notes yet.</p> : (
                <div className="space-y-3">
                  {notes.filter((n) => !n.is_feedback).map((note) => (
                    <div key={note.id} className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                      <p className="text-sm leading-relaxed text-slate-200">{note.note}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-[10px] text-slate-600">{note.author_email && <span className="text-slate-500">{note.author_email} · </span>}{note.created_at ? new Date(note.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
                        <button onClick={() => handleDeleteNote(note.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">

            {/* Attendance */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Attendance</p><h2 className="mt-0.5 text-lg font-black text-white">Session History</h2></div>
              {attendanceSummary.rate !== null && (
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between text-xs"><span className="text-slate-500">Rate</span><span className={`font-black ${attendanceSummary.rate >= 80 ? 'text-emerald-400' : attendanceSummary.rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{attendanceSummary.rate}%</span></div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${attendanceSummary.rate >= 80 ? 'bg-emerald-500' : attendanceSummary.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${attendanceSummary.rate}%` }} /></div>
                </div>
              )}
              <form onSubmit={handleQuickAddAttendance} className="mb-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <select value={quickAttendanceStatus} onChange={(e) => setQuickAttendanceStatus(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-500">{['Present','Absent','Late','Excused'].map((s) => <option key={s}>{s}</option>)}</select>
                  <select value={quickAttendanceSessionType} onChange={(e) => setQuickAttendanceSessionType(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-500">{['Training','Match','Gym','Recovery','Testing'].map((s) => <option key={s}>{s}</option>)}</select>
                </div>
                <input type="date" value={quickAttendanceDate} onChange={(e) => setQuickAttendanceDate(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-500" />
                <button type="submit" disabled={savingQuickAttendance} className="w-full rounded-xl border border-emerald-500 bg-emerald-500/15 py-2 text-xs font-black text-emerald-300 disabled:opacity-50">{savingQuickAttendance ? '...' : 'Add Record'}</button>
              </form>
              {attendanceRecords.length === 0 ? <p className="text-sm text-slate-500">No records yet.</p> : (
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {attendanceRecords.slice(0, 30).map((record) => {
                    const isEditing = editingAttendanceId === record.id;
                    return (
                      <div key={record.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              <select value={editAttendanceStatus} onChange={(e) => setEditAttendanceStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none">{['Present','Absent','Late','Excused'].map((s) => <option key={s}>{s}</option>)}</select>
                              <select value={editAttendanceSessionType} onChange={(e) => setEditAttendanceSessionType(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none">{['Training','Match','Gym','Recovery','Testing'].map((s) => <option key={s}>{s}</option>)}</select>
                              <input type="date" value={editAttendanceDate} onChange={(e) => setEditAttendanceDate(e.target.value)} className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none" />
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleSaveAttendanceEdit(record.id)} disabled={savingAttendanceEdit} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300 disabled:opacity-50">{savingAttendanceEdit ? '...' : 'Save'}</button>
                              <button onClick={cancelAttendanceEdit} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${getStatusClasses(record.status)}`}>{formatStatus(record.status)}</span>
                            <div className="min-w-0 flex-1"><p className="text-xs text-slate-300 truncate">{record.session_type}</p><p className="text-[10px] text-slate-600">{formatDate(record.session_date)}</p></div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => startAttendanceEdit(record)} className="rounded-md border border-slate-700 bg-slate-800/60 px-1.5 py-1 text-[9px] text-slate-400 hover:text-white">Edit</button>
                              <button onClick={() => handleDeleteAttendance(record.id)} className="rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-1 text-[9px] text-red-300">✕</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {attendanceRecords.length > 30 && <p className="text-center text-[10px] text-slate-600 pt-1">+{attendanceRecords.length - 30} more</p>}
                </div>
              )}
            </div>

            {/* Performance records */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Testing</p><h2 className="mt-0.5 text-lg font-black text-white">All Records</h2></div>
              <form onSubmit={handleQuickAddPerformance} className="mb-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <input value={quickPerformanceTestType} onChange={(e) => setQuickPerformanceTestType(e.target.value)} list="perf-tests" placeholder="Test type" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-sky-500" />
                <datalist id="perf-tests">{['SBJ','10m Sprint','30m Sprint','505 Left','505 Right','Push-Ups','Pull-Ups','Yo-Yo IR1','RSA Sdec%'].map((t) => <option key={t} value={t} />)}</datalist>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="any" value={quickPerformanceResult} onChange={(e) => setQuickPerformanceResult(e.target.value)} placeholder="Result" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-500" />
                  <input value={quickPerformanceUnit} onChange={(e) => setQuickPerformanceUnit(e.target.value)} placeholder="Unit" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-500" />
                </div>
                <input type="date" value={quickPerformanceDate} onChange={(e) => setQuickPerformanceDate(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-500" />
                <button type="submit" disabled={savingQuickPerformance} className="w-full rounded-xl border border-violet-500 bg-violet-500/15 py-2 text-xs font-black text-violet-300 disabled:opacity-50">{savingQuickPerformance ? '...' : 'Add Result'}</button>
              </form>
              {performanceRecords.length === 0 ? <p className="text-sm text-slate-500">No records yet.</p> : (
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {performanceRecords.map((record) => {
                    const isEditing = editingPerformanceId === record.id;
                    return (
                      <div key={record.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              <input value={editPerformanceTestType} onChange={(e) => setEditPerformanceTestType(e.target.value)} placeholder="Test type" className="flex-1 min-w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-sky-500" />
                              <input type="number" step="any" value={editPerformanceResult} onChange={(e) => setEditPerformanceResult(e.target.value)} placeholder="Result" className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-sky-500" />
                              <input value={editPerformanceUnit} onChange={(e) => setEditPerformanceUnit(e.target.value)} placeholder="Unit" className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-sky-500" />
                              <input type="date" value={editPerformanceDate} onChange={(e) => setEditPerformanceDate(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-sky-500" />
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleSavePerformanceEdit(record.id)} disabled={savingPerformanceEdit} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300 disabled:opacity-50">{savingPerformanceEdit ? '...' : 'Save'}</button>
                              <button onClick={cancelPerformanceEdit} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-black text-violet-300">{record.test_type}</span>
                            <p className="flex-1 text-xs font-bold text-white">{formatResult(record.value, record.unit)}</p>
                            <p className="shrink-0 text-[10px] text-slate-600">{formatDate(record.test_date)}</p>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => startPerformanceEdit(record)} className="rounded-md border border-slate-700 bg-slate-800/60 px-1.5 py-1 text-[9px] text-slate-400 hover:text-white">Edit</button>
                              <button onClick={() => handleDeletePerformance(record.id)} className="rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-1 text-[9px] text-red-300">✕</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
