'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];
const TERMS = ['Term 1','Term 2','Term 3'];

const TESTS = [
  { key: 'chin_up_hang',      label: 'Chin Up Hang',     unit: 's',    higher: true,  grade: '8' },
  { key: 'broad_jump',        label: 'Broad Jump',        unit: 'cm',   higher: true,  grade: '8' },
  { key: 'pushup_2min',       label: '2 Min Push Up',     unit: 'reps', higher: true,  grade: '9' },
  { key: 'triple_broad_jump', label: 'Triple Broad Jump', unit: 'cm',   higher: true,  grade: '9' },
  { key: 'sprint_10m',        label: '10m Sprint',        unit: 's',    higher: false, grade: 'both' },
  { key: 'sprint_30m',        label: '30m Sprint',        unit: 's',    higher: false, grade: 'both' },
  { key: 'run_500m',          label: '500m Run',          unit: '',     higher: false, grade: 'both' },
];

const BENCH: Record<string, [number, number, number, number]> = {
  chin_up_hang:      [45, 25, 12, 5],
  broad_jump:        [185, 165, 148, 130],
  pushup_2min:       [22, 18, 14, 10],
  triple_broad_jump: [680, 600, 530, 460],
  sprint_10m:        [1.85, 1.97, 2.10, 2.25],
  sprint_30m:        [4.25, 4.52, 4.80, 5.10],
  run_500m:          [100, 115, 130, 150],
};

const TIERS = [
  { label: 'Elite', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', bar: 'bg-emerald-500', dot: '#10b981' },
  { label: 'Good',  color: 'text-sky-400',     bg: 'bg-sky-500/15',     border: 'border-sky-500/30',     bar: 'bg-sky-500',     dot: '#38bdf8' },
  { label: 'Avg',   color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   bar: 'bg-amber-500',   dot: '#fbbf24' },
  { label: 'Dev',   color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  bar: 'bg-orange-500',  dot: '#fb923c' },
  { label: 'Poor',  color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30',     bar: 'bg-red-500',     dot: '#f87171' },
];

function getTier(key: string, val: number, higher: boolean) {
  const b = BENCH[key]; if (!b) return TIERS[2];
  const [e, g, a, d] = b;
  if (higher) {
    if (val >= e) return TIERS[0]; if (val >= g) return TIERS[1];
    if (val >= a) return TIERS[2]; if (val >= d) return TIERS[3]; return TIERS[4];
  } else {
    if (val <= e) return TIERS[0]; if (val <= g) return TIERS[1];
    if (val <= a) return TIERS[2]; if (val <= d) return TIERS[3]; return TIERS[4];
  }
}

function fmt(key: string, val: number): string {
  if (key === 'run_500m') { const m = Math.floor(val/60), s = Math.round(val%60); return `${m}:${s.toString().padStart(2,'0')}`; }
  if (key === 'chin_up_hang') { if (val >= 60) { const m = Math.floor(val/60), s = val%60; return s ? `${m}m${s}s` : `${m}min`; } return `${Math.round(val)}s`; }
  return val % 1 === 0 ? String(val) : val.toFixed(2);
}

function BenchBar({ k, val, higher }: { k: string; val: number; higher: boolean }) {
  const b = BENCH[k]; if (!b) return null;
  const sorted = higher ? b : [...b].reverse() as [number,number,number,number];
  const min = Math.min(...sorted), max = Math.max(...sorted);
  const pct = Math.min(96, Math.max(4, ((val - min) / (max - min)) * 100));
  const pos = higher ? pct : 100 - pct + 4;
  return (
    <div className="relative mt-3">
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        <div className="flex-1 bg-red-500/50"/><div className="flex-1 bg-orange-500/50"/>
        <div className="flex-1 bg-amber-500/50"/><div className="flex-1 bg-sky-500/50"/><div className="flex-1 bg-emerald-500/50"/>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-[#030810] bg-white shadow-lg" style={{ left: `calc(${pos}% - 7px)` }} />
    </div>
  );
}

function Spark({ vals, higher }: { vals: (number|null)[]; higher: boolean }) {
  const v = vals.filter((x): x is number => x !== null);
  if (v.length < 2) return null;
  const mn = Math.min(...v), mx = Math.max(...v), rng = mx - mn || 1;
  const W = 80, H = 32;
  const improved = higher ? v[v.length-1] > v[0] : v[v.length-1] < v[0];
  const color = improved ? '#10b981' : '#f87171';
  const pts = vals.map((x, i) => x !== null ? `${(i/(vals.length-1))*W},${H-3-((x-mn)/rng)*(H-6)}` : null).filter(Boolean).join(' ');
  const lx = W, lv = v[v.length-1], ly = H-3-((lv-mn)/rng)*(H-6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-20" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lx} cy={ly} r="3" fill={color}/>
    </svg>
  );
}

function ImproveBadge({ t1, t2, higher, testKey }: { t1: number|null; t2: number|null; higher: boolean; testKey: string }) {
  if (!t1 || !t2) return null;
  const improved = higher ? t2 > t1 : t2 < t1;
  const pct = Math.abs(((t2 - t1) / t1) * 100).toFixed(1);
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${improved ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
      {improved ? '▲' : '▼'} {pct}%
    </span>
  );
}

export default function HPTrendsPage() {
  const [students, setStudents]   = React.useState<Row[]>([]);
  const [results, setResults]     = React.useState<Row[]>([]);
  const [loading, setLoading]     = React.useState(true);
  const [grade, setGrade]         = React.useState<'Grade 8'|'Grade 9'>('Grade 8');
  const [selYear, setSelYear]     = React.useState(2026);
  const [view, setView]           = React.useState<'overview'|'class'|'athlete'>('overview');
  const [selClass, setSelClass]   = React.useState<string|null>(null);
  const [selStudent, setSelStudent] = React.useState<Row|null>(null);
  const [selTest, setSelTest]     = React.useState('sprint_10m');
  const [search, setSearch]       = React.useState('');

  React.useEffect(() => {
    Promise.all([
      supabase.from('hp_students').select('*').eq('is_active', true),
      supabase.from('hp_test_results').select('*').order('year').order('term'),
    ]).then(([s, r]) => {
      const sorted = (s.data || []).sort((a: Row, b: Row) => {
        const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
        const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
        return sA.localeCompare(sB);
      });
      setStudents(sorted);
      setResults(r.data || []);
      setLoading(false);
    });
  }, []);

  const latest = React.useMemo(() => {
    const map: Record<string, Row> = {};
    results.filter(r => r.year === selYear).forEach(r => { map[r.student_id] = r; });
    return map;
  }, [results, selYear]);

  const gradeStudents = students.filter(s => s.grade === grade);
  const tests = TESTS.filter(t => t.grade === grade.split(' ')[1] || t.grade === 'both');
  const testObj = tests.find(t => t.key === selTest) || tests[0];

  function avg(ss: Row[], key: string) {
    const vals = ss.map(s => { const v = parseFloat(latest[s.id]?.[key]); return isNaN(v) ? null : v; }).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function breakdown(ss: Row[], key: string, higher: boolean) {
    const counts: Record<string, number> = { Elite:0, Good:0, Avg:0, Dev:0, Poor:0, noData:0 };
    ss.forEach(s => {
      const v = parseFloat(latest[s.id]?.[key]);
      if (isNaN(v)) { counts.noData++; return; }
      counts[getTier(key, v, higher).label]++;
    });
    return counts;
  }

  if (loading) return (
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-900 animate-pulse"/>)}
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* ── HEADER ── */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">High Performance</p>
            <h1 className="mt-1 text-3xl font-black text-white">Trends & Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">Performance data across {gradeStudents.length} athletes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Year */}
            <div className="flex rounded-xl border border-slate-700 bg-slate-900 p-0.5">
              {[2025, 2026, 2027].map(y => (
                <button key={y} onClick={() => setSelYear(y)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${selYear === y ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>
                  {y}
                </button>
              ))}
            </div>
            {/* Grade */}
            <div className="flex rounded-xl border border-slate-700 bg-slate-900 p-0.5">
              {(['Grade 8', 'Grade 9'] as const).map(g => (
                <button key={g} onClick={() => { setGrade(g); setSelClass(null); setSelStudent(null); setSelTest('sprint_10m'); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${grade === g ? g === 'Grade 8' ? 'bg-sky-500/25 text-sky-300' : 'bg-violet-500/25 text-violet-300' : 'text-slate-500 hover:text-white'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── VIEW TABS ── */}
        <div className="mb-8 flex gap-1 rounded-2xl border border-slate-800 bg-slate-900 p-1">
          {([['overview', 'Overview', 'Programme snapshot'],['class', 'By Class', 'Class leaderboard'],['athlete', 'Athlete', 'Individual deep-dive']] as const).map(([v, l, sub]) => (
            <button key={v} onClick={() => { setView(v); if (v !== 'athlete') setSelStudent(null); }}
              className={`flex-1 rounded-xl px-3 py-2.5 text-left transition ${view === v ? 'bg-slate-800' : 'hover:bg-slate-800/40'}`}>
              <p className={`text-sm font-black ${view === v ? 'text-white' : 'text-slate-500'}`}>{l}</p>
              <p className="text-[10px] text-slate-600 hidden sm:block">{sub}</p>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            OVERVIEW VIEW
        ══════════════════════════════════════════════ */}
        {view === 'overview' && (() => {
          const tested = gradeStudents.filter(s => latest[s.id]);
          const pctTested = Math.round(tested.length / Math.max(gradeStudents.length, 1) * 100);
          const elites = gradeStudents.filter(s => {
            const r = latest[s.id]; if (!r) return false;
            return tests.some(t => { const v = parseFloat(r[t.key]); return !isNaN(v) && getTier(t.key, v, t.higher).label === 'Elite'; });
          }).length;
          const attention = gradeStudents.filter(s => {
            const r = latest[s.id]; if (!r) return false;
            return tests.some(t => { const v = parseFloat(r[t.key]); return !isNaN(v) && getTier(t.key, v, t.higher).label === 'Poor'; });
          });
          const topClass = HP_CLASSES.map(c => {
            const ss = students.filter(s => s.grade === grade && s.class_group === c);
            const e = ss.filter(s => { const r = latest[s.id]; if (!r) return false; return tests.some(t => { const v = parseFloat(r[t.key]); return !isNaN(v) && getTier(t.key,v,t.higher).label==='Elite'; }); }).length;
            return { c, e, total: ss.length };
          }).filter(x => x.total > 0).sort((a,b) => b.e/b.total - a.e/a.total)[0];

          return (
            <div className="space-y-6">
              {/* Snapshot stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-3xl font-black text-white">{gradeStudents.length}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-600">Athletes</p>
                </div>
                <div className={`rounded-2xl border p-5 ${pctTested === 100 ? 'border-emerald-500/20 bg-emerald-500/5' : pctTested > 50 ? 'border-amber-500/20 bg-amber-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <p className={`text-3xl font-black ${pctTested === 100 ? 'text-emerald-400' : pctTested > 50 ? 'text-amber-400' : 'text-red-400'}`}>{pctTested}%</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-600">Tested · {tested.length}/{gradeStudents.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <p className="text-3xl font-black text-emerald-400">{elites}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-600">Elite performers</p>
                </div>
                <div className={`rounded-2xl border p-5 ${attention.length > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-slate-800 bg-slate-900'}`}>
                  <p className={`text-3xl font-black ${attention.length > 0 ? 'text-red-400' : 'text-slate-600'}`}>{attention.length}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-600">Need attention</p>
                </div>
              </div>

              {/* Attention list */}
              {attention.length > 0 && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-wide text-red-400">Athletes Needing Attention</p>
                  <div className="flex flex-wrap gap-2">
                    {attention.map(s => (
                      <button key={s.id} onClick={() => { setSelStudent(s); setView('athlete'); }}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition">
                        {s.full_name.trim().split(' ').pop()}
                        <span className="ml-1.5 text-red-600">· Class {s.class_group}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Test-by-test class comparison */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div className="border-b border-slate-800 px-5 py-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Class Comparison — select a test</p>
                  <div className="flex flex-wrap gap-2">
                    {tests.map(t => (
                      <button key={t.key} onClick={() => setSelTest(t.key)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${selTest === t.key ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-slate-800/40">
                  {HP_CLASSES.map(c => {
                    const ss = students.filter(s => s.grade === grade && s.class_group === c);
                    if (!ss.length) return null;
                    const a = avg(ss, selTest);
                    const bd = breakdown(ss, selTest, testObj.higher);
                    const tier = a !== null ? getTier(selTest, a, testObj.higher) : null;
                    const testedCount = ss.length - bd.noData;
                    return (
                      <div key={c} className="flex items-center gap-4 px-5 py-4">
                        {/* Class badge */}
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${grade === 'Grade 8' ? 'bg-sky-500/10 text-sky-400' : 'bg-violet-500/10 text-violet-400'}`}>
                          {c}
                        </div>
                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-2 flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-white">Class {c}</span>
                            {tier && a !== null && (
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.color}`}>{tier.label}</span>
                            )}
                            <span className="text-xs text-slate-500">{a !== null ? `${fmt(selTest, a)}${testObj.unit} avg` : 'no data'} · {testedCount}/{ss.length} tested</span>
                          </div>
                          {/* Tier bar */}
                          <div className="flex h-4 w-full overflow-hidden rounded-lg gap-px">
                            {TIERS.map(({ label, bar }) => {
                              const n = bd[label] || 0;
                              return n > 0 ? (
                                <div key={label} className={`${bar} h-full flex items-center justify-center text-[8px] font-black text-white/90`} style={{ flex: n }}>
                                  {n}
                                </div>
                              ) : null;
                            })}
                            {bd.noData > 0 && <div className="bg-slate-800 h-full" style={{ flex: bd.noData }}/>}
                          </div>
                          <div className="mt-1 flex gap-3 flex-wrap">
                            {TIERS.map(({ label, color }) => { const n = bd[label] || 0; return n > 0 ? <span key={label} className={`text-[9px] font-black ${color}`}>{label} {n}</span> : null; })}
                            {bd.noData > 0 && <span className="text-[9px] text-slate-700">No data {bd.noData}</span>}
                          </div>
                        </div>
                        {/* Average value */}
                        {a !== null && (
                          <div className="shrink-0 text-right">
                            <p className={`text-xl font-black ${tier?.color || 'text-white'}`}>{fmt(selTest, a)}</p>
                            <p className="text-[10px] text-slate-600">{testObj.unit} avg</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════
            CLASS VIEW
        ══════════════════════════════════════════════ */}
        {view === 'class' && (
          <div className="space-y-5">
            {/* Class selector */}
            <div className="flex flex-wrap gap-2">
              {HP_CLASSES.map(c => {
                const ss = students.filter(s => s.grade === grade && s.class_group === c);
                const tested = ss.filter(s => latest[s.id]).length;
                const isActive = selClass === c;
                return (
                  <button key={c} onClick={() => setSelClass(isActive ? null : c)}
                    className={`rounded-2xl border px-5 py-3 text-left transition hover:scale-[1.02] ${isActive ? grade==='Grade 8' ? 'border-sky-500/40 bg-sky-500/10' : 'border-violet-500/40 bg-violet-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                    <p className={`text-2xl font-black ${isActive ? grade==='Grade 8' ? 'text-sky-400' : 'text-violet-400' : 'text-white'}`}>{c}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{tested}/{ss.length}</p>
                  </button>
                );
              })}
            </div>

            {/* Class table */}
            {selClass && (() => {
              const ss = students.filter(s => s.grade === grade && s.class_group === selClass);
              return (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-black text-white">{grade} · Class {selClass}</h2>
                      <p className="text-xs text-slate-500">{ss.filter(s => latest[s.id]).length}/{ss.length} athletes tested · click a row for full profile</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[580px]">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60">
                          <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-600">Athlete</th>
                          {tests.map(t => (
                            <th key={t.key} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-600">
                              {t.label.replace('Sprint','').replace('Broad','').replace('Jump','').replace('Run','').trim()}
                            </th>
                          ))}
                          <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-600">Grp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {ss.map(s => {
                          const r = latest[s.id];
                          return (
                            <tr key={s.id} onClick={() => { setSelStudent(s); setView('athlete'); }}
                              className="cursor-pointer hover:bg-slate-800/30 transition">
                              <td className="px-5 py-3">
                                <p className="text-sm font-semibold text-white">{s.full_name}</p>
                              </td>
                              {tests.map(t => {
                                const val = r ? parseFloat(r[t.key]) : NaN;
                                if (isNaN(val)) return <td key={t.key} className="px-3 py-3 text-center text-[11px] text-slate-700">—</td>;
                                const tier = getTier(t.key, val, t.higher);
                                return (
                                  <td key={t.key} className="px-3 py-3 text-center">
                                    <p className={`text-xs font-black ${tier.color}`}>{fmt(t.key, val)}</p>
                                    <p className="text-[8px] text-slate-600">{tier.label}</p>
                                  </td>
                                );
                              })}
                              <td className="px-3 py-3 text-center">
                                {s.training_group
                                  ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${[,'bg-sky-500/15 text-sky-300','bg-violet-500/15 text-violet-300','bg-amber-500/15 text-amber-300','bg-emerald-500/15 text-emerald-300'][s.training_group] || ''}`}>G{s.training_group}</span>
                                  : <span className="text-slate-700 text-[10px]">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            ATHLETE VIEW
        ══════════════════════════════════════════════ */}
        {view === 'athlete' && (
          <div className="space-y-5">
            {!selStudent ? (
              <>
                {/* Search */}
                <div className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search athlete..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-sky-500 transition" />
                </div>
                {/* Athlete grid */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {gradeStudents
                    .filter(s => !search || s.full_name.toLowerCase().includes(search.toLowerCase()))
                    .map(s => {
                      const r = latest[s.id];
                      const tested = tests.filter(t => r && !isNaN(parseFloat(r[t.key]))).length;
                      const eliteCount = tests.filter(t => { if (!r) return false; const v = parseFloat(r[t.key]); return !isNaN(v) && getTier(t.key, v, t.higher).label === 'Elite'; }).length;
                      const topTier = r ? tests.reduce((best: any, t) => {
                        const v = parseFloat(r[t.key]); if (isNaN(v)) return best;
                        const tier = getTier(t.key, v, t.higher);
                        const idx = TIERS.findIndex(x => x.label === tier.label);
                        return (!best || idx < best.idx) ? { tier, idx } : best;
                      }, null)?.tier : null;
                      return (
                        <button key={s.id} onClick={() => setSelStudent(s)}
                          className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-slate-600 transition">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black ${topTier ? `${topTier.bg} ${topTier.color}` : 'bg-slate-800 text-slate-400'}`}>
                            {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{s.full_name}</p>
                            <p className="text-[11px] text-slate-500">Class {s.class_group}{s.training_group ? ` · Group ${s.training_group}` : ''}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            {r ? (
                              <>
                                {eliteCount > 0 && <p className="text-xs font-black text-emerald-400">{eliteCount} elite</p>}
                                <p className="text-[10px] text-slate-600">{tested}/{tests.length} tested</p>
                              </>
                            ) : (
                              <span className="text-[10px] text-amber-500">No data</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="space-y-5">
                {/* Athlete header */}
                <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/30 to-violet-500/10 text-xl font-black text-sky-300">
                    {selStudent.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black text-white truncate">{selStudent.full_name}</h2>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-300">{selStudent.grade}</span>
                      <span className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-300">Class {selStudent.class_group}</span>
                      {selStudent.training_group && (
                        <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${[,'border-sky-500/30 bg-sky-500/10 text-sky-300','border-violet-500/30 bg-violet-500/10 text-violet-300','border-amber-500/30 bg-amber-500/10 text-amber-300','border-emerald-500/30 bg-emerald-500/10 text-emerald-300'][selStudent.training_group] || ''}`}>
                          Group {selStudent.training_group}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/hp/students/${selStudent.id}`}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-300 hover:text-white transition">
                      Full Profile
                    </Link>
                    <button onClick={() => setSelStudent(null)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-400 hover:text-white transition">
                      ← Back
                    </button>
                  </div>
                </div>

                {(() => {
                  const sResults = results.filter(r => r.student_id === selStudent.id && r.year === selYear);
                  const sTests = TESTS.filter(t => t.grade === selStudent.grade.split(' ')[1] || t.grade === 'both');
                  if (!sResults.length) return (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 py-14 text-center">
                      <p className="text-4xl mb-3">📋</p>
                      <p className="text-slate-400 font-semibold">No results recorded for {selYear}</p>
                      <p className="mt-1 text-sm text-slate-600">Go to Testing to enter this athlete's results</p>
                    </div>
                  );

                  const termData = TERMS.map(term => sResults.find(r => r.term === term));
                  const latestResult = termData.filter(Boolean).pop();
                  const eliteCount = sTests.filter(t => { if (!latestResult) return false; const v = parseFloat(latestResult[t.key]); return !isNaN(v) && getTier(t.key, v, t.higher).label === 'Elite'; }).length;
                  const goodCount  = sTests.filter(t => { if (!latestResult) return false; const v = parseFloat(latestResult[t.key]); return !isNaN(v) && getTier(t.key, v, t.higher).label === 'Good'; }).length;
                  const t1 = termData[0], t2 = termData[1];

                  return (
                    <>
                      {/* Summary strip */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                          <p className="text-3xl font-black text-emerald-400">{eliteCount}</p>
                          <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">Elite</p>
                        </div>
                        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-center">
                          <p className="text-3xl font-black text-sky-400">{goodCount}</p>
                          <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">Good</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
                          <p className="text-3xl font-black text-white">{sResults.length}</p>
                          <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">Terms tested</p>
                        </div>
                      </div>

                      {/* Test cards */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sTests.map(t => {
                          const termVals = TERMS.map(term => {
                            const r = sResults.find(r => r.term === term);
                            const v = r ? parseFloat(r[t.key]) : NaN;
                            return isNaN(v) ? null : v;
                          });
                          const latestVal = termVals.filter((v): v is number => v !== null).pop();
                          const tier = latestVal !== undefined ? getTier(t.key, latestVal, t.higher) : null;
                          const t1Val = termVals[0], t2Val = termVals[1];

                          return (
                            <div key={t.key} className={`rounded-2xl border p-4 ${tier ? `${tier.bg} ${tier.border}` : 'border-slate-800 bg-slate-900'}`}>
                              {/* Test name + tier */}
                              <div className="flex items-start justify-between mb-1">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{t.label}</p>
                                {tier && <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.color}`}>{tier.label}</span>}
                              </div>
                              {/* Value */}
                              {latestVal !== undefined
                                ? <p className={`text-2xl font-black ${tier?.color || 'text-white'}`}>
                                    {fmt(t.key, latestVal)}
                                    {t.unit && <span className="ml-1 text-sm opacity-40">{t.unit}</span>}
                                  </p>
                                : <p className="text-2xl font-black text-slate-700">No data</p>
                              }
                              {/* Improvement badge */}
                              {t1Val && t2Val && (
                                <div className="mt-1">
                                  <ImproveBadge t1={t1Val} t2={t2Val} higher={t.higher} testKey={t.key} />
                                </div>
                              )}
                              {/* Term breakdown + sparkline */}
                              {termVals.some(v => v !== null) && (
                                <>
                                  <div className="mt-3 flex items-end justify-between gap-2">
                                    <div className="flex gap-3">
                                      {TERMS.map((term, i) => (
                                        <div key={term} className="text-center">
                                          <p className="text-[8px] text-slate-600">{term.replace('Term ', 'T')}</p>
                                          <p className={`text-[11px] font-black ${termVals[i] !== null ? 'text-white' : 'text-slate-700'}`}>
                                            {termVals[i] !== null ? fmt(t.key, termVals[i]!) : '—'}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                    <Spark vals={termVals} higher={t.higher}/>
                                  </div>
                                  {latestVal !== undefined && <BenchBar k={t.key} val={latestVal} higher={t.higher}/>}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}