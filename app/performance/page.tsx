'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type Athlete = {
  id: string;
  name: string;
  team: string;
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

type PerformanceView = {
  id: string;
  athlete_id: string;
  athlete_name: string;
  team: string;
  test_type: string;
  result: number | null;
  unit: string;
  notes: string;
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

function formatResult(result: number | null, unit: string) {
  if (result === null || Number.isNaN(result)) return '—';
  return `${result}${unit ? ` ${unit}` : ''}`;
}

function sortPerformanceDescending(records: PerformanceView[]) {
  return [...records].sort((a, b) => {
    const aVal = a.result ?? Number.NEGATIVE_INFINITY;
    const bVal = b.result ?? Number.NEGATIVE_INFINITY;
    return bVal - aVal;
  });
}

export default function PerformancePage() {
  const [performanceRows, setPerformanceRows] = useState<GenericRow[]>([]);
  const [athleteRows, setAthleteRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [testType, setTestType] = useState('');
  const [result, setResult] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [testDate, setTestDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [teamFilter, setTeamFilter] = useState('All');
  const [testFilter, setTestFilter] = useState('All');
  const [athleteFilter, setAthleteFilter] = useState('All');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSelectedAthleteId, setEditSelectedAthleteId] = useState('');
  const [editTestType, setEditTestType] = useState('');
  const [editResult, setEditResult] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTestDate, setEditTestDate] = useState('');

  async function loadPageData() {
    setLoading(true);
    setError('');

    const [performanceRes, athletesRes] = await Promise.all([
      supabase.from('Performance').select('*').order('test_date', { ascending: false }),
      supabase.from('athletes').select('*'),
    ]);

    if (performanceRes.error || athletesRes.error) {
      setError(
        performanceRes.error?.message ||
          athletesRes.error?.message ||
          'Failed to load performance data.'
      );
      setPerformanceRows([]);
      setAthleteRows([]);
      setLoading(false);
      return;
    }

    setPerformanceRows((performanceRes.data as GenericRow[]) || []);
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

  const performance = useMemo(() => {
    return performanceRows
      .map(normalizePerformance)
      .map((record): PerformanceView => {
        const athlete = athleteMap.get(String(record.athlete_id));

        return {
          id: record.id,
          athlete_id: record.athlete_id,
          athlete_name: athlete?.name || 'Unknown Athlete',
          team: athlete?.team || 'Unassigned',
          test_type: record.test_type,
          result: record.result,
          unit: record.unit,
          notes: record.notes,
          date: record.test_date,
          created_at: record.created_at,
        };
      })
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      });
  }, [performanceRows, athleteMap]);

  const athleteOptions = useMemo(() => {
    return athletes.map((athlete) => ({
      value: String(athlete.id),
      label: `${athlete.name}${athlete.team && athlete.team !== 'Unassigned' ? ` • ${athlete.team}` : ''}`,
    }));
  }, [athletes]);

  const uniqueTeams = useMemo(() => {
    return Array.from(
      new Set(performance.map((entry) => entry.team).filter((value) => value && value !== 'Unassigned'))
    ).sort((a, b) => a.localeCompare(b));
  }, [performance]);

  const uniqueTests = useMemo(() => {
    return Array.from(new Set(performance.map((entry) => entry.test_type).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [performance]);

  const uniqueAthletes = useMemo(() => {
    return Array.from(new Set(performance.map((entry) => entry.athlete_name).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [performance]);

  const filteredPerformance = useMemo(() => {
    return performance.filter((entry) => {
      const matchesTeam = teamFilter === 'All' || entry.team === teamFilter;
      const matchesTest = testFilter === 'All' || entry.test_type === testFilter;
      const matchesAthlete = athleteFilter === 'All' || entry.athlete_name === athleteFilter;

      return matchesTeam && matchesTest && matchesAthlete;
    });
  }, [performance, teamFilter, testFilter, athleteFilter]);

  const summary = useMemo(() => {
    const totalRecords = filteredPerformance.length;
    const uniqueAthleteCount = new Set(filteredPerformance.map((entry) => entry.athlete_id)).size;
    const uniqueTestCount = new Set(filteredPerformance.map((entry) => entry.test_type)).size;

    const latestDate =
      filteredPerformance.length > 0
        ? filteredPerformance
            .map((entry) => entry.date)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : '';

    return {
      totalRecords,
      uniqueAthleteCount,
      uniqueTestCount,
      latestDate,
    };
  }, [filteredPerformance]);

  const topLeaderboards = useMemo(() => {
    const grouped = new Map<string, PerformanceView[]>();

    filteredPerformance.forEach((entry) => {
      if (!grouped.has(entry.test_type)) grouped.set(entry.test_type, []);
      grouped.get(entry.test_type)!.push(entry);
    });

    return Array.from(grouped.entries())
      .map(([testTypeName, entries]) => ({
        testType: testTypeName,
        entries: sortPerformanceDescending(entries.filter((entry) => entry.result !== null)).slice(0, 5),
      }))
      .filter((group) => group.entries.length > 0)
      .slice(0, 4);
  }, [filteredPerformance]);

  const trends = useMemo(() => {
    const grouped = new Map<string, PerformanceView[]>();

    filteredPerformance.forEach((entry) => {
      const key = `${entry.athlete_id}__${entry.test_type}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(entry);
    });

    const trendRows: {
      athlete_name: string;
      team: string;
      test_type: string;
      latest: number | null;
      previous: number | null;
      delta: number | null;
      unit: string;
      latestDate: string;
    }[] = [];

    grouped.forEach((entries) => {
      const sorted = [...entries]
        .filter((entry) => entry.result !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (sorted.length === 0) return;

      const latest = sorted[0];
      const previous = sorted.length > 1 ? sorted[1] : undefined;

      trendRows.push({
        athlete_name: latest.athlete_name,
        team: latest.team,
        test_type: latest.test_type,
        latest: latest.result,
        previous: previous ? previous.result : null,
        delta:
          latest.result !== null && previous && previous.result !== null
            ? latest.result - previous.result
            : null,
        unit: latest.unit,
        latestDate: latest.date,
      });
    });

    return trendRows
      .sort((a, b) => {
        const aAbs = a.delta === null ? -1 : Math.abs(a.delta);
        const bAbs = b.delta === null ? -1 : Math.abs(b.delta);
        return bAbs - aAbs;
      })
      .slice(0, 10);
  }, [filteredPerformance]);

  async function handleAddPerformance(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    if (!selectedAthleteId) {
      setError('Please select an athlete.');
      setSubmitting(false);
      return;
    }

    if (!testType.trim()) {
      setError('Test type is required.');
      setSubmitting(false);
      return;
    }

    if (!testDate) {
      setError('Test date is required.');
      setSubmitting(false);
      return;
    }

    const numericResult = Number(result);

    if (result === '' || Number.isNaN(numericResult)) {
      setError('Result must be a valid number.');
      setSubmitting(false);
      return;
    }

    const payload = {
      athlete_id: selectedAthleteId,
      test_date: testDate,
      test_type: testType.trim(),
      result: numericResult,
      unit: unit.trim(),
      notes: notes.trim(),
    };

    const response = await supabase.from('Performance').insert([payload]).select('*').single();

    if (response.error) {
      setError(response.error.message || 'Failed to add performance record.');
      setSubmitting(false);
      return;
    }

    setSelectedAthleteId('');
    setTestType('');
    setResult('');
    setUnit('');
    setNotes('');
    setTestDate(new Date().toISOString().split('T')[0]);
    setSuccessMessage('Performance record added successfully.');
    await loadPageData();
    setSubmitting(false);
  }

  function startEdit(record: PerformanceView) {
    setEditingId(record.id);
    setEditSelectedAthleteId(record.athlete_id);
    setEditTestType(record.test_type || '');
    setEditResult(record.result !== null ? String(record.result) : '');
    setEditUnit(record.unit || '');
    setEditNotes(record.notes || '');
    setEditTestDate(record.date || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSelectedAthleteId('');
    setEditTestType('');
    setEditResult('');
    setEditUnit('');
    setEditNotes('');
    setEditTestDate('');
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

    if (!editTestType.trim()) {
      setError('Test type is required.');
      setSavingEdit(false);
      return;
    }

    if (!editTestDate) {
      setError('Test date is required.');
      setSavingEdit(false);
      return;
    }

    const numericResult = Number(editResult);

    if (editResult === '' || Number.isNaN(numericResult)) {
      setError('Result must be a valid number.');
      setSavingEdit(false);
      return;
    }

    const payload = {
      athlete_id: editSelectedAthleteId,
      test_date: editTestDate,
      test_type: editTestType.trim(),
      result: numericResult,
      unit: editUnit.trim(),
      notes: editNotes.trim(),
    };

    const response = await supabase.from('Performance').update(payload).eq('id', id).select('*').single();

    if (response.error) {
      setError(response.error.message || 'Failed to update performance record.');
      setSavingEdit(false);
      return;
    }

    setSuccessMessage('Performance record updated successfully.');
    cancelEdit();
    await loadPageData();
    setSavingEdit(false);
  }

  async function handleDeletePerformance(id: string, athleteName: string, testName: string) {
    const confirmed = window.confirm(`Delete ${testName} result for ${athleteName}?`);
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const { error } = await supabase.from('Performance').delete().eq('id', id);

    if (error) {
      setError(error.message || 'Failed to delete performance record.');
      return;
    }

    setSuccessMessage('Performance record deleted successfully.');
    await loadPageData();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              Performance Tracking
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Performance</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Log testing data, compare athlete results, monitor trends, and keep a running performance history.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/athletes"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Open Athletes
            </Link>
            <Link
              href="/teams"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Open Teams
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
            <p className="text-xs uppercase tracking-wide text-slate-400">Filtered Records</p>
            <p className="mt-3 text-3xl font-bold">{summary.totalRecords}</p>
            <p className="mt-2 text-sm text-slate-300">Performance rows matching current filters.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Athletes in View</p>
            <p className="mt-3 text-3xl font-bold">{summary.uniqueAthleteCount}</p>
            <p className="mt-2 text-sm text-slate-300">Unique athletes in the filtered set.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Tests in View</p>
            <p className="mt-3 text-3xl font-bold">{summary.uniqueTestCount}</p>
            <p className="mt-2 text-sm text-slate-300">Unique test types currently shown.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Latest Test Date</p>
            <p className="mt-3 text-2xl font-bold">{summary.latestDate ? formatDate(summary.latestDate) : '—'}</p>
            <p className="mt-2 text-sm text-slate-300">Most recent test date in the filtered data.</p>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-1">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Add Performance Record</h2>
              <p className="mt-1 text-sm text-slate-400">Capture a new testing result for an athlete.</p>
            </div>

            <form onSubmit={handleAddPerformance} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Select Athlete</label>
                <select
                  value={selectedAthleteId}
                  onChange={(e) => setSelectedAthleteId(e.target.value)}
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
                <label className="mb-2 block text-sm font-medium text-slate-200">Test Type</label>
                <input
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  placeholder="e.g. Pull-Ups, Bronco, 10m Sprint"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Result</label>
                <input
                  type="number"
                  step="any"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="e.g. 33"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Unit</label>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. reps, sec, kg, cm"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional context or coaching notes"
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Test Date</label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Adding Record...' : 'Add Performance Record'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Performance Filters</h2>
              <p className="mt-1 text-sm text-slate-400">
                Filter results by team, test type, and athlete.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Team</label>
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
                <label className="mb-2 block text-sm font-medium text-slate-200">Test Type</label>
                <select
                  value={testFilter}
                  onChange={(e) => setTestFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="All">All Test Types</option>
                  {uniqueTests.map((testName) => (
                    <option key={testName} value={testName}>
                      {testName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Athlete</label>
                <select
                  value={athleteFilter}
                  onChange={(e) => setAthleteFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="All">All Athletes</option>
                  {uniqueAthletes.map((athleteName) => (
                    <option key={athleteName} value={athleteName}>
                      {athleteName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Leaderboards</h2>
              <p className="mt-1 text-sm text-slate-400">
                Top filtered performances by test type.
              </p>
            </div>

            {topLeaderboards.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No leaderboard data available for the current filters.
              </div>
            ) : (
              <div className="space-y-4">
                {topLeaderboards.map((group) => (
                  <div key={group.testType} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <h3 className="text-sm font-semibold text-white">{group.testType}</h3>
                    <div className="mt-3 space-y-2">
                      {group.entries.map((entry, index) => (
                        <div
                          key={`${group.testType}-${entry.id}`}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">
                              #{index + 1} {entry.athlete_name}
                            </p>
                            <p className="text-xs text-slate-400">{entry.team}</p>
                          </div>
                          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                            {formatResult(entry.result, entry.unit)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Trends</h2>
              <p className="mt-1 text-sm text-slate-400">
                Latest change between the most recent two scores per athlete and test.
              </p>
            </div>

            {trends.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                No trend data available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {trends.map((trend, index) => (
                  <div
                    key={`${trend.athlete_name}-${trend.test_type}-${index}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {trend.athlete_name} • {trend.test_type}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {trend.team} • Latest: {formatDate(trend.latestDate)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                          Latest: {formatResult(trend.latest, trend.unit)}
                        </span>
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                          Previous: {formatResult(trend.previous, trend.unit)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            trend.delta === null
                              ? 'bg-slate-800 text-slate-300'
                              : trend.delta > 0
                              ? 'bg-emerald-500/15 text-emerald-200'
                              : trend.delta < 0
                              ? 'bg-red-500/15 text-red-200'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          Δ {trend.delta === null ? '—' : `${trend.delta}${trend.unit ? ` ${trend.unit}` : ''}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Performance Records</h2>
            <p className="mt-1 text-sm text-slate-400">
              Full editable list of performance results in the filtered view.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              Loading performance...
            </div>
          ) : filteredPerformance.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
              No performance records found for the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPerformance.map((record) => {
                const isEditing = editingId === record.id;

                return (
                  <div
                    key={record.id}
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
                              onChange={(e) => setEditSelectedAthleteId(e.target.value)}
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
                              Test Type
                            </label>
                            <input
                              value={editTestType}
                              onChange={(e) => setEditTestType(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">
                              Result
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={editResult}
                              onChange={(e) => setEditResult(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">
                              Unit
                            </label>
                            <input
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">
                              Test Date
                            </label>
                            <input
                              type="date"
                              value={editTestDate}
                              onChange={(e) => setEditTestDate(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                            />
                          </div>

                          <div className="md:col-span-2 xl:col-span-1">
                            <label className="mb-2 block text-sm font-medium text-slate-200">
                              Notes
                            </label>
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              rows={3}
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
                        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Athlete</p>
                            <p className="mt-1 text-sm font-semibold text-white">{record.athlete_name}</p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Team</p>
                            <p className="mt-1 text-sm text-slate-300">{record.team}</p>
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
                            <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
                            <p className="mt-1 text-sm text-slate-300">{formatDate(record.date)}</p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
                            <p className="mt-1 text-sm text-slate-300">{record.notes || '—'}</p>
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
                              handleDeletePerformance(record.id, record.athlete_name, record.test_type)
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
        </section>
      </div>
    </main>
  );
}