'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeUUID } from '@/lib/uuid';

type Row = Record<string, any>;

// ── BATTERY DEFINITIONS ──────────────────────────────────────────────────────

const U1415_BATTERY = [
  { key: 'SBJ', name: 'Standing Broad Jump', unit: 'cm', type: 'numeric', lower: false, priority: 3 },
  { key: '10m Sprint', name: '10m Sprint', unit: 's', type: 'numeric', lower: true, priority: 3 },
  { key: '30m Sprint', name: '30m Sprint', unit: 's', type: 'numeric', lower: true, priority: 2 },
  { key: '505 Left', name: '505 Agility (Left)', unit: 's', type: 'numeric', lower: true, priority: 3 },
  { key: '505 Right', name: '505 Agility (Right)', unit: 's', type: 'numeric', lower: true, priority: 3 },
  { key: 'Push-Ups', name: 'Push-Up Test (60s)', unit: 'reps', type: 'numeric', lower: false, priority: 2 },
  { key: 'Yo-Yo IR1', name: 'Yo-Yo IR1', unit: 'm', type: 'numeric', lower: false, priority: 3 },
  { key: 'RSA Sdec%', name: 'RSA (6×30m / 30s rest)', unit: '%', type: 'rsa', lower: true, priority: 3 },
  { key: 'Movement Screen', name: 'Movement Quality Screen', unit: '', type: 'qualitative3', lower: false, priority: 3, options: ['PASS', 'FLAG', 'FAIL'] },
];

const U1618_BATTERY = [
  { key: 'SBJ', name: 'Standing Broad Jump', unit: 'cm', type: 'numeric', lower: false, priority: 3 },
  { key: '10m Sprint', name: '10m Sprint', unit: 's', type: 'numeric', lower: true, priority: 3 },
  { key: '30m Sprint', name: '30m Sprint', unit: 's', type: 'numeric', lower: true, priority: 2 },
  { key: '505 Left', name: '505 Agility (Left)', unit: 's', type: 'numeric', lower: true, priority: 3 },
  { key: '505 Right', name: '505 Agility (Right)', unit: 's', type: 'numeric', lower: true, priority: 3 },
  { key: 'Push-Ups', name: 'Push-Up Test (60s)', unit: 'reps', type: 'numeric', lower: false, priority: 2 },
  { key: 'Pull-Ups', name: 'Pull-Up Max', unit: 'reps', type: 'numeric', lower: false, priority: 2 },
  { key: 'Yo-Yo IR1', name: 'Yo-Yo IR1', unit: 'm', type: 'numeric', lower: false, priority: 3 },
  { key: 'RSA Sdec%', name: 'RSA (6×30m / 20s rest)', unit: '%', type: 'rsa', lower: true, priority: 3 },
  { key: 'Movement Screen', name: 'Movement Screen + Nordic', unit: '', type: 'qualitative3', lower: false, priority: 3, options: ['PASS', 'FLAG', 'FAIL'] },
  { key: 'Nordic Screen', name: 'Nordic Hamstring Screen', unit: '', type: 'qualitative3', lower: false, priority: 3, options: ['GOOD', 'MODERATE', 'AT RISK'] },
];

// ── BENCHMARKS ───────────────────────────────────────────────────────────────

type BenchmarkTier = { label: string; color: string; bg: string; border: string };

const TIERS: BenchmarkTier[] = [
  { label: 'Elite', color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  { label: 'Good', color: 'text-sky-300', bg: 'bg-sky-500/20', border: 'border-sky-500/30' },
  { label: 'Average', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  { label: 'Developing', color: 'text-orange-300', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { label: 'Poor', color: 'text-red-300', bg: 'bg-red-500/20', border: 'border-red-500/30' },
];

// [Elite threshold, Good threshold, Average threshold, Developing threshold] — above/below depends on lower
const BENCHMARKS: Record<string, { u1415: number[]; u1618: number[] }> = {
  'SBJ': { u1415: [195, 175, 155, 135], u1618: [215, 195, 175, 155] },
  '10m Sprint': { u1415: [1.72, 1.82, 1.92, 2.02], u1618: [1.65, 1.75, 1.85, 1.95] },
  '30m Sprint': { u1415: [4.25, 4.45, 4.65, 4.85], u1618: [4.05, 4.25, 4.45, 4.65] },
  '505 Left': { u1415: [2.35, 2.50, 2.65, 2.80], u1618: [2.25, 2.40, 2.55, 2.70] },
  '505 Right': { u1415: [2.35, 2.50, 2.65, 2.80], u1618: [2.25, 2.40, 2.55, 2.70] },
  'Push-Ups': { u1415: [40, 30, 20, 10], u1618: [50, 38, 26, 14] },
  'Pull-Ups': { u1415: [10, 7, 4, 1], u1618: [10, 7, 4, 1] },
  'Yo-Yo IR1': { u1415: [1200, 900, 700, 500], u1618: [1600, 1200, 900, 600] },
  'RSA Sdec%': { u1415: [3.0, 5.0, 7.0, 10.0], u1618: [2.5, 4.0, 6.0, 9.0] },
};

function getBenchmarkTier(testKey: string, value: number, ageGroup: string, lowerIsBetter: boolean): BenchmarkTier | null {
  const b = BENCHMARKS[testKey];
  if (!b) return null;
  const thresholds = ageGroup === 'U14-U15' ? b.u1415 : b.u1618;
  if (lowerIsBetter) {
    if (value < thresholds[0]) return TIERS[0];
    if (value < thresholds[1]) return TIERS[1];
    if (value < thresholds[2]) return TIERS[2];
    if (value < thresholds[3]) return TIERS[3];
    return TIERS[4];
  } else {
    if (value > thresholds[0]) return TIERS[0];
    if (value > thresholds[1]) return TIERS[1];
    if (value > thresholds[2]) return TIERS[2];
    if (value > thresholds[3]) return TIERS[3];
    return TIERS[4];
  }
}

function calculateSdec(times: string[]): { sdec: number; best: number; worst: number; mean: number } | null {
  const nums = times.map(Number).filter((n) => !isNaN(n) && n > 0);
  if (nums.length < 2) return null;
  const best = Math.min(...nums);
  const worst = Math.max(...nums);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const sdec = ((mean / best) - 1) * 100;
  return { sdec: Math.round(sdec * 100) / 100, best: Math.round(best * 100) / 100, worst: Math.round(worst * 100) / 100, mean: Math.round(mean * 100) / 100 };
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [athletes, setAthletes] = useState<Row[]>([]);
  const [records, setRecords] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [view, setView] = useState<'overview' | 'session' | 'records'>('overview');

  // Session state
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionTeam, setSessionTeam] = useState('');
  const [sessionAgeGroup, setSessionAgeGroup] = useState<'U14-U15' | 'U16-1st'>('U14-U15');
  const [sessionPoint, setSessionPoint] = useState<'Pre-Season' | 'Mid-Season' | 'Post-Season'>('Pre-Season');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionStep, setSessionStep] = useState<'setup' | 'testing'>('setup');
  const [activeTestIndex, setActiveTestIndex] = useState(0);
  const [testInputs, setTestInputs] = useState<Record<string, Record<string, string>>>({});
  const [rsaInputs, setRsaInputs] = useState<Record<string, string[]>>({});
  const [qualInputs, setQualInputs] = useState<Record<string, string>>({});
  const [sessionSaving, setSessionSaving] = useState(false);

  // Records filters
  const [filterTeam, setFilterTeam] = useState('All');
  const [filterTest, setFilterTest] = useState('All');

  // Auto-clear success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ath, rec] = await Promise.all([
      supabase.from('athletes').select('*').order('name'),
      supabase.from('Performance').select('*').order('test_date', { ascending: false }),
    ]);
    if (ath.data) setAthletes(ath.data);
    if (rec.data) setRecords(rec.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const normalizeAthlete = (row: Row) => ({
    id: String(row.id || row.athlete_id || ''),
    name: String(row.name || row.full_name || row.athlete_name || 'Unknown'),
    team: String(row.team || row.team_name || 'Unassigned'),
    ageGroup: String(row.age_group || row.agegroup || ''),
  });

  const athleteList = useMemo(() => athletes.map(normalizeAthlete), [athletes]);

  const allTeams = useMemo(() =>
    Array.from(new Set(athleteList.map((a) => a.team).filter((t) => t && t !== 'Unassigned'))).sort(),
    [athleteList]
  );

  const battery = sessionAgeGroup === 'U14-U15' ? U1415_BATTERY : U1618_BATTERY;

  const sessionSquad = useMemo(() =>
    sessionTeam ? athleteList.filter((a) => a.team === sessionTeam) : [],
    [athleteList, sessionTeam]
  );

  const activeTest = battery[activeTestIndex];

  function startSession() {
    if (!sessionTeam) { setError('Please select a team.'); return; }
    setError('');
    setSessionStep('testing');
    setActiveTestIndex(0);
    setTestInputs({});
    setRsaInputs({});
    setQualInputs({});
  }

  function setTestInput(athleteId: string, value: string) {
    setTestInputs((prev) => ({ ...prev, [athleteId]: { ...(prev[athleteId] || {}), [activeTest.key]: value } }));
  }

  function setRsaInput(athleteId: string, index: number, value: string) {
    setRsaInputs((prev) => {
      const current = prev[athleteId] || ['', '', '', '', '', ''];
      const updated = [...current];
      updated[index] = value;
      return { ...prev, [athleteId]: updated };
    });
  }

  function setQualInput(athleteId: string, value: string) {
    setQualInputs((prev) => ({ ...prev, [`${athleteId}_${activeTest.key}`]: value }));
  }

  async function saveTestAndNext() {
    setSessionSaving(true);
    const rows: Row[] = [];

    for (const athlete of sessionSquad) {
      if (activeTest.type === 'rsa') {
        const times = rsaInputs[athlete.id] || [];
        const calc = calculateSdec(times);
        if (calc) {
          rows.push({ athlete_id: athlete.id, test_date: sessionDate, test_type: 'RSA Sdec%', result: calc.sdec, unit: '%', notes: `Times:${times.join(',')} | Best:${calc.best} | Worst:${calc.worst} | Mean:${calc.mean} | Point:${sessionPoint}` });
          rows.push({ athlete_id: athlete.id, test_date: sessionDate, test_type: 'RSA Best Sprint', result: calc.best, unit: 's', notes: sessionPoint });
        }
      } else if (activeTest.type === 'qualitative3') {
        const qual = qualInputs[`${athlete.id}_${activeTest.key}`];
        if (qual) {
          rows.push({ athlete_id: athlete.id, test_date: sessionDate, test_type: activeTest.key, result: 0, unit: qual, notes: sessionPoint });
        }
      } else {
        const val = testInputs[athlete.id]?.[activeTest.key];
        if (val?.trim()) {
          rows.push({ athlete_id: athlete.id, test_date: sessionDate, test_type: activeTest.key, result: Number(val), unit: activeTest.unit, notes: sessionPoint });
        }
      }
    }

    if (rows.length > 0) {
      const { error: err } = await supabase.from('Performance').insert(rows);
      if (err) { setError(err.message); setSessionSaving(false); return; }
    }

    if (activeTestIndex < battery.length - 1) {
      setActiveTestIndex((i) => i + 1);
    } else {
      setSuccess(`Testing session saved — ${sessionPoint} complete for ${sessionTeam}!`);
      setSessionOpen(false);
      setSessionStep('setup');
      await loadData();
    }
    setSessionSaving(false);
  }

  // Squad heatmap data
  const heatmapTeams = useMemo(() => allTeams, [allTeams]);
  const [heatmapTeam, setHeatmapTeam] = useState('');

  const heatmapSquad = useMemo(() =>
    heatmapTeam ? athleteList.filter((a) => a.team === heatmapTeam) : [],
    [athleteList, heatmapTeam]
  );

  const heatmapAgeGroup = useMemo(() => {
    const squad = heatmapSquad;
    if (squad.length === 0) return 'U16-1st';
    const ag = squad[0].ageGroup || '';
    return ag.includes('14') || ag.includes('15') ? 'U14-U15' : 'U16-1st';
  }, [heatmapSquad]);

  const heatmapBattery = heatmapAgeGroup === 'U14-U15' ? U1415_BATTERY : U1618_BATTERY;

  function getLatestResult(athleteId: string, testKey: string): { value: number; text?: string; notes?: string } | null {
    const r = records
      .filter((rec) => String(rec.athlete_id) === athleteId && rec.test_type === testKey)
      .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];
    if (!r) return null;
    return { value: Number(r.result), text: r.unit, notes: r.notes };
  }

  // Unique teams and tests for filter
  const uniqueFilterTeams = useMemo(() =>
    Array.from(new Set(records.map((r) => {
      const a = athleteList.find((at) => at.id === String(r.athlete_id));
      return a?.team || '';
    }).filter(Boolean))).sort(),
    [records, athleteList]
  );
  const uniqueFilterTests = useMemo(() =>
    Array.from(new Set(records.map((r) => r.test_type))).sort(),
    [records]
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const a = athleteList.find((at) => at.id === String(r.athlete_id));
      const matchTeam = filterTeam === 'All' || a?.team === filterTeam;
      const matchTest = filterTest === 'All' || r.test_type === filterTest;
      return matchTeam && matchTest;
    }).slice(0, 100);
  }, [records, athleteList, filterTeam, filterTest]);

  const stats = useMemo(() => ({
    total: records.length,
    athletes: new Set(records.map((r) => r.athlete_id)).size,
    tests: new Set(records.map((r) => r.test_type)).size,
    latest: records[0]?.test_date || null,
  }), [records]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">High Performance</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Testing & Performance</h1>
            <p className="mt-1 text-sm text-slate-500">{stats.total} records across {stats.athletes} athletes</p>
          </div>
          <button onClick={() => setSessionOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-violet-500/40 bg-violet-500/10 px-5 py-3 text-sm font-black text-violet-300 transition hover:bg-violet-500/20 sm:self-start">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Start Testing Session
          </button>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {success && <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{success}</div>}

        {/* Stats */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Records', value: stats.total, color: 'sky' },
            { label: 'Athletes Tested', value: stats.athletes, color: 'violet' },
            { label: 'Test Types', value: stats.tests, color: 'emerald' },
            { label: 'Last Tested', value: stats.latest ? new Date(stats.latest).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '—', color: 'amber', small: true },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border bg-slate-900 p-4 ${
              s.color === 'sky' ? 'border-sky-500/20' : s.color === 'violet' ? 'border-violet-500/20' :
              s.color === 'emerald' ? 'border-emerald-500/20' : 'border-amber-500/20'
            }`}>
              <p className={`font-black ${(s as any).small ? 'text-xl' : 'text-3xl'} ${
                s.color === 'sky' ? 'text-sky-400' : s.color === 'violet' ? 'text-violet-400' :
                s.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'
              }`}>{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            </div>
          ))}
        </section>

        {/* View Tabs */}
        <div className="mb-6 flex gap-2">
          {(['overview', 'records'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-xl px-4 py-2 text-sm font-black capitalize transition ${
                view === v ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
              }`}>
              {v === 'overview' ? 'Squad Heatmap' : 'All Records'}
            </button>
          ))}
        </div>

        {/* ── SQUAD HEATMAP ──────────────────────────────── */}
        {view === 'overview' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Squad Overview</p>
                <h2 className="mt-0.5 text-lg font-black text-white">Performance Heatmap</h2>
                <p className="mt-1 text-xs text-slate-500">Colour-coded by benchmark: Elite / Good / Average / Developing / Poor</p>
              </div>
              <select value={heatmapTeam} onChange={(e) => setHeatmapTeam(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-sky-500 sm:w-44">
                <option value="">Select team...</option>
                {heatmapTeams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Benchmark legend */}
            <div className="mb-5 flex flex-wrap gap-2">
              {TIERS.map((t) => (
                <div key={t.label} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${t.bg} ${t.border} ${t.color}`}>
                  {t.label}
                </div>
              ))}
              <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-black text-slate-400">Not Tested</div>
            </div>

            {!heatmapTeam ? (
              <p className="py-8 text-center text-sm text-slate-500">Select a team to view their heatmap.</p>
            ) : heatmapSquad.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No athletes found in this team.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="py-3 pr-4 text-left text-xs font-black uppercase tracking-wide text-slate-500 sticky left-0 bg-slate-900">Player</th>
                      {heatmapBattery.filter((t) => t.type !== 'qualitative3').map((test) => (
                        <th key={test.key} className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-500 whitespace-nowrap">
                          {test.key}
                        </th>
                      ))}
                      <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">Screen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {heatmapSquad.map((athlete) => (
                      <tr key={athlete.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 pr-4 sticky left-0 bg-slate-900">
                          <Link href={`/athletes/${athlete.id}`} className="flex items-center gap-2 hover:text-sky-400">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300">
                              {initials(athlete.name)}
                            </div>
                            <span className="text-sm font-bold text-white whitespace-nowrap">{athlete.name}</span>
                          </Link>
                        </td>
                        {heatmapBattery.filter((t) => t.type !== 'qualitative3').map((test) => {
                          const result = getLatestResult(athlete.id, test.key);
                          if (!result) return (
                            <td key={test.key} className="px-2 py-3 text-center">
                              <span className="rounded-lg bg-slate-800/60 px-2 py-1 text-[10px] text-slate-600">—</span>
                            </td>
                          );
                          const tier = getBenchmarkTier(test.key, result.value, heatmapAgeGroup, test.lower);
                          return (
                            <td key={test.key} className="px-2 py-3 text-center">
                              <span className={`rounded-lg border px-2 py-1 text-[11px] font-black ${tier ? `${tier.bg} ${tier.border} ${tier.color}` : 'bg-slate-800 text-slate-300'}`}>
                                {result.value}{test.unit}
                              </span>
                            </td>
                          );
                        })}
                        {/* Movement screen */}
                        <td className="px-2 py-3 text-center">
                          {(() => {
                            const r = getLatestResult(athlete.id, 'Movement Screen');
                            if (!r) return <span className="rounded-lg bg-slate-800/60 px-2 py-1 text-[10px] text-slate-600">—</span>;
                            const val = r.text || '';
                            const col = val === 'PASS' || val === 'GOOD' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                              val === 'FLAG' || val === 'MODERATE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              'bg-red-500/20 text-red-300 border-red-500/30';
                            return <span className={`rounded-lg border px-2 py-1 text-[10px] font-black ${col}`}>{val || '—'}</span>;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ALL RECORDS ───────────────────────────────── */}
        {view === 'records' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">History</p>
              <h2 className="mt-0.5 text-lg font-black text-white">All Records</h2>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Team</label>
                <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
                  <option value="All">All Teams</option>
                  {uniqueFilterTeams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Test</label>
                <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
                  <option value="All">All Tests</option>
                  {uniqueFilterTests.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center gap-3 p-5">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                <p className="text-sm text-slate-400">Loading...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No records found.</p>
            ) : (
              <div className="space-y-2">
                {filteredRecords.map((record, i) => {
                  const athlete = athleteList.find((a) => a.id === String(record.athlete_id));
                  const isQual = ['Movement Screen', 'Nordic Screen'].includes(record.test_type);
                  const displayValue = isQual ? record.unit : `${record.result}${record.unit ? ` ${record.unit}` : ''}`;
                  return (
                    <div key={`${record.id}-${i}`} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-black text-violet-400">
                        {initials(athlete?.name || '?')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {athlete && (
                            <Link href={`/athletes/${athlete.id}`} className="text-sm font-bold text-white hover:text-sky-400">
                              {athlete.name}
                            </Link>
                          )}
                          <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-black text-violet-300">{record.test_type}</span>
                          <span className="text-sm font-black text-white">{displayValue}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {athlete?.team} • {record.test_date ? new Date(record.test_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          {record.notes && ` • ${record.notes.split('|')[0].replace('Times:', 'Splits: ')}`}
                        </p>
                      </div>
                      <button onClick={async () => {
                        if (!confirm('Delete this record?')) return;
                        await supabase.from('Performance').delete().eq('id', record.id);
                        setRecords((prev) => prev.filter((r) => r.id !== record.id));
                      }} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20">
                        ✕
                      </button>
                    </div>
                  );
                })}
                <p className="mt-2 text-center text-xs text-slate-600">Showing {filteredRecords.length} of {records.length} records</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── TESTING SESSION MODAL ─────────────────────── */}
      {sessionOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-2xl rounded-t-3xl border border-slate-700 bg-slate-900 sm:rounded-3xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
                  {sessionStep === 'setup' ? 'New Session' : `${sessionPoint} — ${sessionTeam}`}
                </p>
                <h2 className="text-lg font-black text-white">
                  {sessionStep === 'setup' ? 'Testing Session Setup' : activeTest?.name}
                </h2>
                {sessionStep === 'testing' && (
                  <p className="mt-0.5 text-xs text-slate-500">Test {activeTestIndex + 1} of {battery.length}</p>
                )}
              </div>
              <button onClick={() => { setSessionOpen(false); setSessionStep('setup'); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">

              {/* Step 1 — Setup */}
              {sessionStep === 'setup' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Team</label>
                      <select value={sessionTeam} onChange={(e) => setSessionTeam(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
                        <option value="">Select team...</option>
                        {allTeams.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Date</label>
                      <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-400">Age Group — determines battery</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['U14-U15', 'U16-1st'] as const).map((ag) => (
                        <button key={ag} onClick={() => setSessionAgeGroup(ag)}
                          className={`rounded-xl border py-3 text-sm font-black transition ${
                            sessionAgeGroup === ag ? 'border-violet-500 bg-violet-500/20 text-violet-300' : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                          }`}>
                          {ag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-400">Testing Point</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Pre-Season', 'Mid-Season', 'Post-Season'] as const).map((pt) => (
                        <button key={pt} onClick={() => setSessionPoint(pt)}
                          className={`rounded-xl border py-2.5 text-xs font-black transition ${
                            sessionPoint === pt ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                          }`}>
                          {pt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Battery preview */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">{sessionAgeGroup} Battery — {battery.length} tests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {battery.map((t) => (
                        <span key={t.key} className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-300">{t.name}</span>
                      ))}
                    </div>
                  </div>

                  <button onClick={startSession}
                    className="w-full rounded-xl border border-violet-500 bg-violet-500/15 py-3 text-sm font-black text-violet-300 transition hover:bg-violet-500/25">
                    Start Session — {sessionTeam ? `${sessionTeam} (${sessionSquad.length} players)` : 'Select team first'}
                  </button>
                </div>
              )}

              {/* Step 2 — Testing */}
              {sessionStep === 'testing' && activeTest && (
                <div>
                  {/* Progress bar */}
                  <div className="mb-5">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                      <span>{activeTestIndex + 1} / {battery.length}</span>
                      <span>{Math.round(((activeTestIndex) / battery.length) * 100)}% complete</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${((activeTestIndex) / battery.length) * 100}%` }} />
                    </div>
                  </div>

                  {/* Test instructions */}
                  {activeTest.type === 'rsa' && (
                    <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-xs text-amber-300">
                      Enter all 6 sprint times — Sdec% calculated automatically. Leave blank to skip a player.
                    </div>
                  )}
                  {activeTest.type === 'qualitative3' && (
                    <div className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/8 p-3 text-xs text-sky-300">
                      Tap the rating for each player. Leave unselected to skip.
                    </div>
                  )}
                  {activeTest.key.includes('505') && (
                    <div className="mb-4 rounded-xl border border-violet-500/20 bg-violet-500/8 p-3 text-xs text-violet-300">
                      Record best of 2 attempts. Flag if left/right difference &gt; 0.08s.
                    </div>
                  )}

                  {/* Player inputs */}
                  <div className="space-y-3">
                    {sessionSquad.map((athlete) => (
                      <div key={athlete.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-slate-300">
                            {initials(athlete.name)}
                          </div>
                          <p className="text-sm font-bold text-white">{athlete.name}</p>
                        </div>

                        {/* RSA — 6 sprint times */}
                        {activeTest.type === 'rsa' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-6 gap-1.5">
                              {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div key={i}>
                                  <label className="mb-1 block text-center text-[9px] text-slate-600">T{i + 1}</label>
                                  <input type="number" step="0.01" placeholder="0.00"
                                    value={(rsaInputs[athlete.id] || [])[i] || ''}
                                    onChange={(e) => setRsaInput(athlete.id, i, e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-center text-sm text-white outline-none focus:border-violet-500" />
                                </div>
                              ))}
                            </div>
                            {(() => {
                              const calc = calculateSdec(rsaInputs[athlete.id] || []);
                              if (!calc) return null;
                              const tier = getBenchmarkTier('RSA Sdec%', calc.sdec, sessionAgeGroup, true);
                              return (
                                <div className="flex items-center gap-3 rounded-lg bg-slate-900 p-2 text-xs">
                                  <span className="text-slate-500">Sdec: <span className={`font-black ${tier?.color}`}>{calc.sdec}%</span></span>
                                  <span className="text-slate-500">Best: <span className="text-white font-bold">{calc.best}s</span></span>
                                  <span className="text-slate-500">Mean: <span className="text-white font-bold">{calc.mean}s</span></span>
                                  {tier && <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${tier.bg} ${tier.color}`}>{tier.label}</span>}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Qualitative — Pass/Flag/Fail or Good/Moderate/At Risk */}
                        {activeTest.type === 'qualitative3' && (
                          <div className="flex gap-2">
                            {(activeTest.options || []).map((opt) => {
                              const selected = qualInputs[`${athlete.id}_${activeTest.key}`] === opt;
                              const col = opt === 'PASS' || opt === 'GOOD' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' :
                                opt === 'FLAG' || opt === 'MODERATE' ? 'border-amber-500 bg-amber-500/20 text-amber-300' :
                                'border-red-500 bg-red-500/20 text-red-300';
                              return (
                                <button key={opt} onClick={() => setQualInput(athlete.id, opt)}
                                  className={`flex-1 rounded-xl border py-2 text-xs font-black transition ${selected ? col : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Numeric */}
                        {activeTest.type === 'numeric' && (
                          <div className="flex items-center gap-2">
                            <input type="number" step="0.01" placeholder={`Enter ${activeTest.unit}...`}
                              value={testInputs[athlete.id]?.[activeTest.key] || ''}
                              onChange={(e) => setTestInput(athlete.id, e.target.value)}
                              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
                            <span className="text-sm text-slate-500 shrink-0">{activeTest.unit}</span>
                            {(() => {
                              const val = Number(testInputs[athlete.id]?.[activeTest.key]);
                              if (!val) return null;
                              const tier = getBenchmarkTier(activeTest.key, val, sessionAgeGroup, activeTest.lower);
                              if (!tier) return null;
                              return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${tier.bg} ${tier.border} ${tier.color}`}>{tier.label}</span>;
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex gap-3">
                    {activeTestIndex > 0 && (
                      <button onClick={() => setActiveTestIndex((i) => i - 1)}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white">
                        ← Back
                      </button>
                    )}
                    <button onClick={saveTestAndNext} disabled={sessionSaving}
                      className="flex-1 rounded-xl border border-violet-500 bg-violet-500/15 py-3 text-sm font-black text-violet-300 transition hover:bg-violet-500/25 disabled:opacity-50">
                      {sessionSaving ? 'Saving...' : activeTestIndex === battery.length - 1 ? 'Save & Finish Session ✓' : `Save & Next — ${battery[activeTestIndex + 1]?.name} →`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}