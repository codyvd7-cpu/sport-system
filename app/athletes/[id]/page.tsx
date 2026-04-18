'use client';

import Link from 'next/link';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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

function formatResult(result: number | null, unit: string) {
  if (result === null || Number.isNaN(result)) return '—';
  return `${result}${unit ? ` ${unit}` : ''}`;
}

function buildAthleteUpdatePayload(raw: GenericRow, input: { name: string; team: string; sport: string; ageGroup: string }) {
  const payload: GenericRow = {};

  if ('name' in raw) payload.name = input.name;
  else if ('full_name' in raw) payload.full_name = input.name;
  else if ('athlete_name' in raw) payload.athlete_name = input.name;
  else if ('player_name' in raw) payload.player_name = input.name;
  else if ('first_name' in raw && 'last_name' in raw) {
    const parts = input.name.trim().split(' ');
    payload.first_name = parts.shift() || input.name;
    payload.last_name = parts.join(' ');
  }

  if ('team' in raw) payload.team = input.team;
  else if ('team_name' in raw) payload.team_name = input.team;
  else if ('squad' in raw) payload.squad = input.team;
  else if ('group_name' in raw) payload.group_name = input.team;

  if ('sport' in raw) payload.sport = input.sport;
  else if ('code' in raw) payload.code = input.sport;
  else if ('discipline' in raw) payload.discipline = input.sport;

  if ('age_group' in raw) payload.age_group = input.ageGroup;
  else if ('agegroup' in raw) payload.agegroup = input.ageGroup;
  else if ('grade_group' in raw) payload.grade_group = input.ageGroup;
  else if ('group' in raw) payload.group = input.ageGroup;

  return payload;
}

function trendBadge(delta: number | null, unit: string) {
  if (delta === null) {
    return (
      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
        Δ —
      </span>
    );
  }

  if (delta > 0) {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200">
        Δ +{delta}
        {unit ? ` ${unit}` : ''}
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-200">
        Δ {delta}
        {unit ? ` ${unit}` : ''}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
      Δ 0
      {unit ? ` ${unit}` : ''}
    </span>
  );
}

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

  async function loadPageData() {
    setLoading(true);
    setError('');

    const [athletesRes, attendanceRes, performanceRes] = await Promise.all([
      supabase.from('athletes').select('*').order('id', { ascending: true }),
      supabase.from('Attendance').select('*').eq('athlete_id', athleteId).order('session_date', { ascending: false }),
      supabase.from('Performance').select('*').eq('athlete_id', athleteId).order('test_date', { ascending: false }),
    ]);

    if (athletesRes.error || attendanceRes.error || performanceRes.error) {
      setError(
        athletesRes.error?.message ||
          attendanceRes.error?.message ||
          performanceRes.error?.message ||
          'Failed to load athlete profile.'
      );
      setAthleteRows([]);
      setAttendanceRows([]);
      setPerformanceRows([]);
      setLoading(false);
      return;
    }

    setAthleteRows((athletesRes.data as GenericRow[]) || []);
    setAttendanceRows((attendanceRes.data as GenericRow[]) || []);
    setPerformanceRows((performanceRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  React.useEffect(() => {
    loadPageData();
  }, [athleteId]);

  const athletes = React.useMemo(() => {
    return athleteRows.map(normalizeAthlete).sort((a, b) => a.name.localeCompare(b.name));
  }, [athleteRows]);

  const athlete = React.useMemo(() => {
    return athletes.find((item) => String(item.id) === String(athleteId)) || null;
  }, [athletes, athleteId]);

  const athleteIndex = React.useMemo(() => {
    return athletes.findIndex((item) => String(item.id) === String(athleteId));
  }, [athletes, athleteId]);

  const previousAthlete = athleteIndex > 0 ? athletes[athleteIndex - 1] : null;
  const nextAthlete = athleteIndex >= 0 && athleteIndex < athletes.length - 1 ? athletes[athleteIndex + 1] : null;

  const attendance = React.useMemo(() => {
    return attendanceRows.map(normalizeAttendance).sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }, [attendanceRows]);

  const performance = React.useMemo(() => {
    return performanceRows.map(normalizePerformance).sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
  }, [performanceRows]);

  React.useEffect(() => {
    if (!athlete) return;
    setAthleteNameInput(athlete.name);
    setAthleteTeamInput(athlete.team);
    setAthleteSportInput(athlete.sport === '—' ? '' : athlete.sport);
    setAthleteAgeGroupInput(athlete.ageGroup === '—' ? '' : athlete.ageGroup);
  }, [athlete]);

  const attendanceSummary = React.useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((item) => item.status.toLowerCase() === 'present').length;
    const late = attendance.filter((item) => item.status.toLowerCase() === 'late').length;
    const absent = attendance.filter((item) => item.status.toLowerCase() === 'absent').length;
    const excused = attendance.filter((item) => item.status.toLowerCase() === 'excused').length;
    const positive = present + late;
    const rate = total > 0 ? Math.round((positive / total) * 100) : 0;
    const latest = total > 0 ? attendance[0].session_date : '';

    return { total, present, late, absent, excused, rate, latest };
  }, [attendance]);

  const performanceSummary = React.useMemo(() => {
    const total = performance.length;
    const latest = total > 0 ? performance[0].test_date : '';
    const uniqueTests = new Set(performance.map((item) => item.test_type)).size;
    const bestRecent = [...performance]
      .filter((item) => item.result !== null)
      .sort((a, b) => (b.result ?? Number.NEGATIVE_INFINITY) - (a.result ?? Number.NEGATIVE_INFINITY))[0];

    return {
      total,
      latest,
      uniqueTests,
      bestRecent,
    };
  }, [performance]);

  const performanceTrends = React.useMemo(() => {
    const grouped = new Map<string, PerformanceRecord[]>();

    performance.forEach((entry) => {
      if (!grouped.has(entry.test_type)) grouped.set(entry.test_type, []);
      grouped.get(entry.test_type)!.push(entry);
    });

    const rows: {
      testType: string;
      latest: number | null;
      previous: number | null;
      delta: number | null;
      unit: string;
      latestDate: string;
    }[] = [];

    grouped.forEach((entries, testType) => {
      const sorted = [...entries]
        .filter((entry) => entry.result !== null)
        .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());

      if (sorted.length === 0) return;

      const latest = sorted[0];
      const previous = sorted.length > 1 ? sorted[1] : undefined;

      rows.push({
        testType,
        latest: latest.result,
        previous: previous ? previous.result : null,
        delta:
          latest.result !== null && previous && previous.result !== null
            ? latest.result - previous.result
            : null,
        unit: latest.unit,
        latestDate: latest.test_date,
      });
    });

    return rows.sort((a, b) => {
      const aVal = a.delta === null ? -1 : Math.abs(a.delta);
      const bVal = b.delta === null ? -1 : Math.abs(b.delta);
      return bVal - aVal;
    });
  }, [performance]);

  async function handleSaveAthleteProfile() {
    if (!athlete) return;

    setSavingAthlete(true);
    setError('');
    setSuccessMessage('');

    if (!athleteNameInput.trim()) {
      setError('Athlete name is required.');
      setSavingAthlete(false);
      return;
    }

    const payload = buildAthleteUpdatePayload(athlete.raw, {
      name: athleteNameInput.trim(),
      team: athleteTeamInput.trim(),
      sport: athleteSportInput.trim(),
      ageGroup: athleteAgeGroupInput.trim(),
    });

    const result = await supabase.from('athletes').update(payload).eq('id', athlete.id).select('*').single();

    if (result.error) {
      setError(result.error.message || 'Failed to update athlete.');
      setSavingAthlete(false);
      return;
    }

    setSuccessMessage('Athlete profile updated successfully.');
    setIsEditingAthlete(false);
    await loadPageData();
    setSavingAthlete(false);
  }

  async function handleDeleteAthlete() {
    if (!athlete) return;

    const confirmed = window.confirm(`Delete ${athlete.name}? This cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const result = await supabase.from('athletes').delete().eq('id', athlete.id);

    if (result.error) {
      setError(result.error.message || 'Failed to delete athlete.');
      return;
    }

    router.push('/athletes');
  }

  async function handleQuickAddAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!athlete) return;

    setSavingQuickAttendance(true);
    setError('');
    setSuccessMessage('');

    if (!quickAttendanceDate) {
      setError('Attendance date is required.');
      setSavingQuickAttendance(false);
      return;
    }

    const payload = {
      athlete_id: athlete.id,
      session_date: quickAttendanceDate,
      session_type: quickAttendanceSessionType.trim(),
      status: quickAttendanceStatus.trim(),
    };

    const result = await supabase.from('Attendance').insert([payload]).select('*').single();

    if (result.error) {
      setError(result.error.message || 'Failed to add attendance entry.');
      setSavingQuickAttendance(false);
      return;
    }

    setQuickAttendanceDate(new Date().toISOString().split('T')[0]);
    setQuickAttendanceSessionType('Training');
    setQuickAttendanceStatus('Present');
    setSuccessMessage('Attendance entry added.');
    await loadPageData();
    setSavingQuickAttendance(false);
  }

  async function handleQuickAddPerformance(e: React.FormEvent) {
    e.preventDefault();
    if (!athlete) return;

    setSavingQuickPerformance(true);
    setError('');
    setSuccessMessage('');

    if (!quickPerformanceTestType.trim()) {
      setError('Test type is required.');
      setSavingQuickPerformance(false);
      return;
    }

    if (!quickPerformanceDate) {
      setError('Test date is required.');
      setSavingQuickPerformance(false);
      return;
    }

    const numericResult = Number(quickPerformanceResult);
    if (quickPerformanceResult === '' || Number.isNaN(numericResult)) {
      setError('Result must be a valid number.');
      setSavingQuickPerformance(false);
      return;
    }

    const payload = {
      athlete_id: athlete.id,
      test_date: quickPerformanceDate,
      test_type: quickPerformanceTestType.trim(),
      result: numericResult,
      unit: quickPerformanceUnit.trim(),
      notes: quickPerformanceNotes.trim(),
    };

    const result = await supabase.from('Performance').insert([payload]).select('*').single();

    if (result.error) {
      setError(result.error.message || 'Failed to add performance entry.');
      setSavingQuickPerformance(false);
      return;
    }

    setQuickPerformanceDate(new Date().toISOString().split('T')[0]);
    setQuickPerformanceTestType('');
    setQuickPerformanceResult('');
    setQuickPerformanceUnit('');
    setQuickPerformanceNotes('');
    setSuccessMessage('Performance entry added.');
    await loadPageData();
    setSavingQuickPerformance(false);
  }

  function startAttendanceEdit(record: AttendanceRecord) {
    setEditingAttendanceId(record.id);
    setEditAttendanceDate(record.session_date);
    setEditAttendanceSessionType(record.session_type || 'Training');
    setEditAttendanceStatus(formatStatus(record.status) || 'Present');
  }

  function cancelAttendanceEdit() {
    setEditingAttendanceId(null);
    setEditAttendanceDate('');
    setEditAttendanceSessionType('Training');
    setEditAttendanceStatus('Present');
  }

  async function handleSaveAttendanceEdit(id: string) {
    setSavingAttendanceEdit(true);
    setError('');
    setSuccessMessage('');

    if (!editAttendanceDate) {
      setError('Attendance date is required.');
      setSavingAttendanceEdit(false);
      return;
    }

    const payload = {
      session_date: editAttendanceDate,
      session_type: editAttendanceSessionType.trim(),
      status: editAttendanceStatus.trim(),
    };

    const result = await supabase.from('Attendance').update(payload).eq('id', id).select('*').single();

    if (result.error) {
      setError(result.error.message || 'Failed to update attendance entry.');
      setSavingAttendanceEdit(false);
      return;
    }

    setSuccessMessage('Attendance entry updated.');
    cancelAttendanceEdit();
    await loadPageData();
    setSavingAttendanceEdit(false);
  }

  async function handleDeleteAttendance(id: string) {
    const confirmed = window.confirm('Delete this attendance entry?');
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const result = await supabase.from('Attendance').delete().eq('id', id);

    if (result.error) {
      setError(result.error.message || 'Failed to delete attendance entry.');
      return;
    }

    setSuccessMessage('Attendance entry deleted.');
    await loadPageData();
  }

  function startPerformanceEdit(record: PerformanceRecord) {
    setEditingPerformanceId(record.id);
    setEditPerformanceDate(record.test_date);
    setEditPerformanceTestType(record.test_type || '');
    setEditPerformanceResult(record.result !== null ? String(record.result) : '');
    setEditPerformanceUnit(record.unit || '');
    setEditPerformanceNotes(record.notes || '');
  }

  function cancelPerformanceEdit() {
    setEditingPerformanceId(null);
    setEditPerformanceDate('');
    setEditPerformanceTestType('');
    setEditPerformanceResult('');
    setEditPerformanceUnit('');
    setEditPerformanceNotes('');
  }

  async function handleSavePerformanceEdit(id: string) {
    setSavingPerformanceEdit(true);
    setError('');
    setSuccessMessage('');

    if (!editPerformanceTestType.trim()) {
      setError('Test type is required.');
      setSavingPerformanceEdit(false);
      return;
    }

    if (!editPerformanceDate) {
      setError('Test date is required.');
      setSavingPerformanceEdit(false);
      return;
    }

    const numericResult = Number(editPerformanceResult);
    if (editPerformanceResult === '' || Number.isNaN(numericResult)) {
      setError('Result must be a valid number.');
      setSavingPerformanceEdit(false);
      return;
    }

    const payload = {
      test_date: editPerformanceDate,
      test_type: editPerformanceTestType.trim(),
      result: numericResult,
      unit: editPerformanceUnit.trim(),
      notes: editPerformanceNotes.trim(),
    };

    const result = await supabase.from('Performance').update(payload).eq('id', id).select('*').single();

    if (result.error) {
      setError(result.error.message || 'Failed to update performance entry.');
      setSavingPerformanceEdit(false);
      return;
    }

    setSuccessMessage('Performance entry updated.');
    cancelPerformanceEdit();
    await loadPageData();
    setSavingPerformanceEdit(false);
  }

  async function handleDeletePerformance(id: string) {
    const confirmed = window.confirm('Delete this performance entry?');
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const result = await supabase.from('Performance').delete().eq('id', id);

    if (result.error) {
      setError(result.error.message || 'Failed to delete performance entry.');
      return;
    }

    setSuccessMessage('Performance entry deleted.');
    await loadPageData();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
            Loading athlete profile...
          </div>
        </div>
      </main>
    );
  }

  if (!athlete) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h1 className="text-2xl font-bold text-white">Athlete not found</h1>
            <p className="mt-2 text-sm text-slate-300">This athlete does not exist in the current dataset.</p>
            <Link
              href="/athletes"
              className="mt-4 inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
            >
              Back to Athletes
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
              Athlete Profile
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">{athlete.name}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {athlete.team} • {athlete.sport} • {athlete.ageGroup}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/athletes"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Back to Athletes
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
            <p className="text-xs uppercase tracking-wide text-slate-400">Attendance Rate</p>
            <p className="mt-3 text-3xl font-bold">{attendanceSummary.rate}%</p>
            <p className="mt-2 text-sm text-slate-300">Present + late as a percentage of all logged sessions.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Attendance Entries</p>
            <p className="mt-3 text-3xl font-bold">{attendanceSummary.total}</p>
            <p className="mt-2 text-sm text-slate-300">Total attendance records for this athlete.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Performance Entries</p>
            <p className="mt-3 text-3xl font-bold">{performanceSummary.total}</p>
            <p className="mt-2 text-sm text-slate-300">Total performance results on file.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Tests Logged</p>
            <p className="mt-3 text-3xl font-bold">{performanceSummary.uniqueTests}</p>
            <p className="mt-2 text-sm text-slate-300">Unique test types recorded for this athlete.</p>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Athlete Info</h2>
                <p className="mt-1 text-sm text-slate-400">Profile details and athlete actions.</p>
              </div>
              {!isEditingAthlete ? (
                <button
                  onClick={() => setIsEditingAthlete(true)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {!isEditingAthlete ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
                  <p className="mt-1 text-sm font-semibold text-white">{athlete.name}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Team</p>
                  <p className="mt-1 text-sm text-slate-300">{athlete.team}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Sport</p>
                  <p className="mt-1 text-sm text-slate-300">{athlete.sport}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Age Group</p>
                  <p className="mt-1 text-sm text-slate-300">{athlete.ageGroup}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {previousAthlete ? (
                    <Link
                      href={`/athletes/${previousAthlete.id}`}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
                    >
                      Previous
                    </Link>
                  ) : null}

                  {nextAthlete ? (
                    <Link
                      href={`/athletes/${nextAthlete.id}`}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
                    >
                      Next
                    </Link>
                  ) : null}

                  <button
                    onClick={handleDeleteAthlete}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                  >
                    Delete Athlete
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Name</label>
                  <input
                    value={athleteNameInput}
                    onChange={(e) => setAthleteNameInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Team</label>
                  <input
                    value={athleteTeamInput}
                    onChange={(e) => setAthleteTeamInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Sport</label>
                  <input
                    value={athleteSportInput}
                    onChange={(e) => setAthleteSportInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Age Group</label>
                  <input
                    value={athleteAgeGroupInput}
                    onChange={(e) => setAthleteAgeGroupInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSaveAthleteProfile}
                    disabled={savingAthlete}
                    className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingAthlete ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditingAthlete(false)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-1">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Quick Add Attendance</h2>
              <p className="mt-1 text-sm text-slate-400">Log a session for this athlete directly from the profile.</p>
            </div>

            <form onSubmit={handleQuickAddAttendance} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Date</label>
                <input
                  type="date"
                  value={quickAttendanceDate}
                  onChange={(e) => setQuickAttendanceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Session Type</label>
                <select
                  value={quickAttendanceSessionType}
                  onChange={(e) => setQuickAttendanceSessionType(e.target.value)}
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
                  value={quickAttendanceStatus}
                  onChange={(e) => setQuickAttendanceStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Excused">Excused</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingQuickAttendance}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingQuickAttendance ? 'Saving...' : 'Add Attendance'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-1">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Quick Add Performance</h2>
              <p className="mt-1 text-sm text-slate-400">Add a testing result without leaving the athlete profile.</p>
            </div>

            <form onSubmit={handleQuickAddPerformance} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Test Date</label>
                <input
                  type="date"
                  value={quickPerformanceDate}
                  onChange={(e) => setQuickPerformanceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Test Type</label>
                <input
                  value={quickPerformanceTestType}
                  onChange={(e) => setQuickPerformanceTestType(e.target.value)}
                  placeholder="e.g. Pull-Ups"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Result</label>
                <input
                  type="number"
                  step="any"
                  value={quickPerformanceResult}
                  onChange={(e) => setQuickPerformanceResult(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Unit</label>
                  <input
                    value={quickPerformanceUnit}
                    onChange={(e) => setQuickPerformanceUnit(e.target.value)}
                    placeholder="e.g. reps"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Notes</label>
                  <input
                    value={quickPerformanceNotes}
                    onChange={(e) => setQuickPerformanceNotes(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingQuickPerformance}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingQuickPerformance ? 'Saving...' : 'Add Performance'}
              </button>
            </form>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Attendance Summary</h2>
              <p className="mt-1 text-sm text-slate-400">Overview of session attendance for this athlete.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-2 text-2xl font-bold">{attendanceSummary.total}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Present</p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">{attendanceSummary.present}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Late</p>
                <p className="mt-2 text-2xl font-bold text-amber-300">{attendanceSummary.late}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Absent</p>
                <p className="mt-2 text-2xl font-bold text-red-300">{attendanceSummary.absent}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Excused</p>
                <p className="mt-2 text-2xl font-bold text-sky-300">{attendanceSummary.excused}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Latest</p>
                <p className="mt-2 text-sm font-semibold text-white">{attendanceSummary.latest ? formatDate(attendanceSummary.latest) : '—'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Performance Snapshot</h2>
              <p className="mt-1 text-sm text-slate-400">Latest performance status for this athlete.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Entries</p>
                <p className="mt-2 text-2xl font-bold">{performanceSummary.total}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tests</p>
                <p className="mt-2 text-2xl font-bold">{performanceSummary.uniqueTests}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Latest</p>
                <p className="mt-2 text-sm font-semibold text-white">{performanceSummary.latest ? formatDate(performanceSummary.latest) : '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Best Recorded Result</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {performanceSummary.bestRecent
                    ? `${performanceSummary.bestRecent.test_type} • ${formatResult(
                        performanceSummary.bestRecent.result,
                        performanceSummary.bestRecent.unit
                      )}`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Performance Trends</h2>
            <p className="mt-1 text-sm text-slate-400">Latest change between the two most recent results per test.</p>
          </div>

          {performanceTrends.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              No trend data available yet.
            </div>
          ) : (
            <div className="space-y-3">
              {performanceTrends.map((trend) => (
                <div
                  key={trend.testType}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{trend.testType}</p>
                      <p className="mt-1 text-sm text-slate-400">Latest: {formatDate(trend.latestDate)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                        Latest: {formatResult(trend.latest, trend.unit)}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                        Previous: {formatResult(trend.previous, trend.unit)}
                      </span>
                      {trendBadge(trend.delta, trend.unit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Attendance History</h2>
              <p className="mt-1 text-sm text-slate-400">Full attendance log for this athlete.</p>
            </div>

            {attendance.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No attendance history yet.
              </div>
            ) : (
              <div className="space-y-4">
                {attendance.map((record) => {
                  const isEditing = editingAttendanceId === record.id;

                  return (
                    <div key={record.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">Date</label>
                              <input
                                type="date"
                                value={editAttendanceDate}
                                onChange={(e) => setEditAttendanceDate(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">Session Type</label>
                              <select
                                value={editAttendanceSessionType}
                                onChange={(e) => setEditAttendanceSessionType(e.target.value)}
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
                                value={editAttendanceStatus}
                                onChange={(e) => setEditAttendanceStatus(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              >
                                <option value="Present">Present</option>
                                <option value="Late">Late</option>
                                <option value="Absent">Absent</option>
                                <option value="Excused">Excused</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleSaveAttendanceEdit(record.id)}
                              disabled={savingAttendanceEdit}
                              className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingAttendanceEdit ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelAttendanceEdit}
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
                              <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
                              <p className="mt-1 text-sm text-slate-300">{formatDate(record.session_date)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Session</p>
                              <p className="mt-1 text-sm text-slate-300">{record.session_type}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                              <div className="mt-1">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(record.status)}`}>
                                  {formatStatus(record.status)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Logged</p>
                              <p className="mt-1 text-sm text-slate-300">{formatDateTime(record.created_at)}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => startAttendanceEdit(record)}
                              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAttendance(record.id)}
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

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Performance History</h2>
              <p className="mt-1 text-sm text-slate-400">Full testing record for this athlete.</p>
            </div>

            {performance.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No performance history yet.
              </div>
            ) : (
              <div className="space-y-4">
                {performance.map((record) => {
                  const isEditing = editingPerformanceId === record.id;

                  return (
                    <div key={record.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">Test Date</label>
                              <input
                                type="date"
                                value={editPerformanceDate}
                                onChange={(e) => setEditPerformanceDate(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">Test Type</label>
                              <input
                                value={editPerformanceTestType}
                                onChange={(e) => setEditPerformanceTestType(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">Result</label>
                              <input
                                type="number"
                                step="any"
                                value={editPerformanceResult}
                                onChange={(e) => setEditPerformanceResult(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">Unit</label>
                              <input
                                value={editPerformanceUnit}
                                onChange={(e) => setEditPerformanceUnit(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-slate-200">Notes</label>
                              <textarea
                                rows={3}
                                value={editPerformanceNotes}
                                onChange={(e) => setEditPerformanceNotes(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleSavePerformanceEdit(record.id)}
                              disabled={savingPerformanceEdit}
                              className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingPerformanceEdit ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelPerformanceEdit}
                              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-5">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
                              <p className="mt-1 text-sm text-slate-300">{formatDate(record.test_date)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Test</p>
                              <p className="mt-1 text-sm text-slate-300">{record.test_type}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Result</p>
                              <p className="mt-1 text-sm text-slate-300">{formatResult(record.result, record.unit)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
                              <p className="mt-1 text-sm text-slate-300">{record.notes || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Logged</p>
                              <p className="mt-1 text-sm text-slate-300">{formatDateTime(record.created_at)}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => startPerformanceEdit(record)}
                              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePerformance(record.id)}
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