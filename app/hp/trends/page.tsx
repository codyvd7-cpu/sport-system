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

// Research-based benchmarks for Grade 8 (13-14yr) and Grade 9 (14-15yr) boys
// Sources: SA schools fitness norms, adolescent team sport research (Tingelstad et al.),
// Published HP testing research for school-age athletes
// Format: [Elite, Good, Average, Developing] — for lower-is-better tests values are reversed
const BENCH: Record<string, [number, number, number, number]> = {
  // Grade 8 tests
  chin_up_hang:      [45, 25, 12, 5],       // Isometric hold (s) — 13-14yr boys norms
  broad_jump:        [185, 165, 148, 130],   // Standing broad jump (cm) — SA schools norms
  // Grade 9 tests
  pushup_2min:       [22, 18, 14, 10],       // 2-rep/10s push up (reps, max=24) — research norms
  triple_broad_jump: [680, 600, 530, 460],   // Triple broad jump (cm) — 14-15yr team sport norms
  // Both grades
  sprint_10m:        [1.85, 1.97, 2.10, 2.25],  // 10m sprint (s) — U14/U15 team sport norms
  sprint_30m:        [4.25, 4.52, 4.80, 5.10],  // 30m sprint (s) — U14/U15 team sport norms
  run_500m:          [100, 115, 130, 150],       // 500m run (s) — SA school fitness norms
};

const TIERS = [
  { label: 'Elite', color: 'text-emerald-400', bg: 'bg-emerald-500/15', bar: 'bg-emerald-500' },
  { label: 'Good',  color: 'text-sky-400',     bg: 'bg-sky-500/15',     bar: 'bg-sky-500' },
  { label: 'Avg',   color: 'text-amber-400',   bg: 'bg-amber-500/15',   bar: 'bg-amber-500' },
  { label: 'Dev',   color: 'text-orange-400',  bg: 'bg-orange-500/15',  bar: 'bg-orange-500' },
  { label: 'Poor',  color: 'text-red-400',     bg: 'bg-red-500/15',     bar: 'bg-red-500' },
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
  if (key === 'run_500m') {
    const m = Math.floor(val/60), s = Math.round(val%60);
    return `${m}:${s.toString().padStart(2,'0')}`;
  }
  if (key === 'chin_up_hang') {
    if (val >= 60) { const m = Math.floor(val/60), s = val%60; return s ? `${m}m${s}s` : `${m}min`; }
    return `${Math.round(val)}s`;
  }
  return val % 1 === 0 ? String(val) : val.toFixed(2);
}

function BenchBar({ k, val, higher }: { k: string; val: number; higher: boolean }) {
  const b = BENCH[k]; if (!b) return null;
  const [e, g, a, d] = higher ? b : [...b].reverse() as [number,number,number,number];
  const min = Math.min(e,g,a,d), max = Math.max(e,g,a,d);
  const pct = Math.min(100, Math.max(2, ((val - min) / (max - min)) * 100));
  const pos = higher ? pct : 100 - pct + 2;
  return (
    <div className="mt-3 relative">
      <div className="h-1.5 w-full rounded-full overflow-hidden flex">
        <div className="flex-1 bg-red-500/60" /><div className="flex-1 bg-orange-500/60" />
        <div className="flex-1 bg-amber-500/60" /><div className="flex-1 bg-sky-500/60" /><div className="flex-1 bg-emerald-500/60" />
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white bg-slate-950 shadow" style={{ left: `calc(${pos}% - 6px)` }} />
    </div>
  );
}

function Spark({ vals, higher }: { vals: (number|null)[]; higher: boolean }) {
  const v = vals.filter((x): x is number => x !== null);
  if (v.length === 0) return <span className="text-[10px] text-slate-700">no data</span>;
  if (v.length === 1) return <span className="text-[10px] text-slate-500">T1 only</span>;
  const mn = Math.min(...v), mx = Math.max(...v), rng = mx - mn || 1;
  const W = 72, H = 28;
  const improved = higher ? v[v.length-1] > v[0] : v[v.length-1] < v[0];
  const pts = vals.map((x, i) => x !== null ? `${(i/(vals.length-1))*W},${H-2-((x-mn)/rng)*(H-4)}` : null).filter(Boolean).join(' ');
  const lx = (vals.length-1)/(vals.length-1)*W;
  const lv = v[v.length-1];
  const ly = H-2-((lv-mn)/rng)*(H-4);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-18" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={improved?'#10b981':'#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lx} cy={ly} r="2.5" fill={improved?'#10b981':'#ef4444'}/>
    </svg>
  );
}

export default function HPTrendsPage() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [results,  setResults]  = React.useState<Row[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [grade, setGrade]       = React.useState<'Grade 8'|'Grade 9'>('Grade 8');
  const [selYear, setSelYear]   = React.useState(2026);
  const [view,  setView]        = React.useState<'overview'|'class'|'student'>('overview');
  const [selClass,   setSelClass]   = React.useState<string|null>(null);
  const [selStudent, setSelStudent] = React.useState<Row|null>(null);
  const [selTest,    setSelTest]    = React.useState('sprint_10m');
  const [search,     setSearch]     = React.useState('');

  React.useEffect(() => {
    Promise.all([
      supabase.from('hp_students').select('*').eq('is_active',true).order('grade').order('full_name'),
      supabase.from('hp_test_results').select('*').order('year').order('term'),
    ]).then(([s, r]) => { setStudents(s.data||[]); setResults(r.data||[]); setLoading(false); });
  }, []);

  const latest = React.useMemo(() => {
    const map: Record<string,Row> = {};
    results.filter(r => r.year === selYear).forEach(r => { map[r.student_id] = r; });
    return map;
  }, [results, selYear]);

  const gradeStudents = students.filter(s => s.grade === grade);
  const tests = TESTS.filter(t => t.grade === grade.split(' ')[1] || t.grade === 'both');
  const testObj = tests.find(t => t.key === selTest) || tests[0];

  function avg(ss: Row[], key: string) {
    const vals = ss.map(s => { const v = parseFloat(latest[s.id]?.[key]); return isNaN(v) ? null : v; }).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  }

  function breakdown(ss: Row[], key: string, higher: boolean) {
    const counts: Record<string,number> = { Elite:0,Good:0,Avg:0,Dev:0,Poor:0,noData:0 };
    ss.forEach(s => {
      const v = parseFloat(latest[s.id]?.[key]);
      if (isNaN(v)) { counts.noData++; return; }
      counts[getTier(key,v,higher).label]++;
    });
    return counts;
  }

  if (loading) return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-900 animate-pulse"/>)}
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>

        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">High Performance</p>
            <h1 className="mt-1 text-3xl font-black text-white">Trends & Analytics</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1.5">
              {[2025, 2026, 2027].map(y => (
                <button key={y} onClick={() => setSelYear(y)}
                  className={`rounded-xl px-3 py-2 text-sm font-black transition ${selYear === y ? 'bg-slate-700 border border-slate-500 text-white' : 'border border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>
                  {y}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {(['Grade 8','Grade 9'] as const).map(g => (
                <button key={g} onClick={() => { setGrade(g); setSelClass(null); setSelStudent(null); setSelTest('sprint_10m'); }}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition ${grade===g ? g==='Grade 8' ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300' : 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View tabs */}
        <div className="mb-6 flex gap-1.5 border-b border-slate-800 pb-4">
          {([['overview','Overview'],['class','By Class'],['student','Individual']] as const).map(([v,l]) => (
            <button key={v} onClick={() => { setView(v); if(v!=='student') setSelStudent(null); }}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${view===v ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────── */}
        {view === 'overview' && (
          <div className="space-y-8">
            {/* Summary strip */}
            {(() => {
              const tested = gradeStudents.filter(s => latest[s.id]);
              const pctTested = Math.round(tested.length/Math.max(gradeStudents.length,1)*100);
              const classCounts = HP_CLASSES.map(c => {
                const ss = students.filter(s => s.grade===grade && s.class_group===c);
                const elites = ss.filter(s => {
                  const r = latest[s.id]; if (!r) return false;
                  return tests.some(t => { const v = parseFloat(r[t.key]); return !isNaN(v) && getTier(t.key,v,t.higher).label==='Elite'; });
                }).length;
                return { c, elites, total: ss.length };
              }).filter(x => x.total > 0).sort((a,b) => b.elites/b.total - a.elites/a.total);
              const topClass = classCounts[0];
              const attention = gradeStudents.filter(s => {
                const r = latest[s.id]; if (!r) return false;
                return tests.some(t => { const v = parseFloat(r[t.key]); return !isNaN(v) && getTier(t.key,v,t.higher).label==='Poor'; });
              }).length;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-2xl font-black text-white">{gradeStudents.length}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Students</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${pctTested===100?'border-emerald-500/20 bg-emerald-500/5':pctTested>50?'border-amber-500/20 bg-amber-500/5':'border-red-500/20 bg-red-500/5'}`}>
                    <p className={`text-2xl font-black ${pctTested===100?'text-emerald-400':pctTested>50?'text-amber-400':'text-red-400'}`}>{pctTested}%</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Tested ({tested.length}/{gradeStudents.length})</p>
                  </div>
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                    <p className="text-2xl font-black text-sky-400">{topClass ? `Class ${topClass.c}` : '—'}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Top Class{topClass ? ` · ${topClass.elites} elite` : ''}</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${attention>0?'border-red-500/20 bg-red-500/5':'border-emerald-500/20 bg-emerald-500/5'}`}>
                    <p className={`text-2xl font-black ${attention>0?'text-red-400':'text-emerald-400'}`}>{attention}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Need Attention</p>
                  </div>
                </div>
              );
            })()}

            {/* Test picker + class comparison */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-800 p-5">
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Compare Classes</p>
                <div className="flex flex-wrap gap-2">
                  {tests.map(t => (
                    <button key={t.key} onClick={() => setSelTest(t.key)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${selTest===t.key ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-800/50">
                {HP_CLASSES.map(c => {
                  const ss = students.filter(s => s.grade===grade && s.class_group===c);
                  if (!ss.length) return null;
                  const a = avg(ss, selTest);
                  const bd = breakdown(ss, selTest, testObj.higher);
                  const tier = a !== null ? getTier(selTest, a, testObj.higher) : null;
                  const pctTested = Math.round((ss.length - bd.noData) / ss.length * 100);
                  return (
                    <div key={c} className="p-4 sm:p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-base font-black ${grade==='Grade 8'?'bg-sky-500/15 text-sky-300':'bg-violet-500/15 text-violet-300'}`}>{c}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-white">Class {c}</p>
                            {tier && a !== null && <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.color}`}>{tier.label}</span>}
                            <span className="text-xs text-slate-500">{a !== null ? fmt(selTest,a)+testObj.unit : '—'} avg · {pctTested}% tested</span>
                          </div>
                        </div>
                      </div>
                      {/* Stacked tier bar */}
                      <div className="flex h-3 w-full overflow-hidden rounded-lg gap-0.5">
                        {TIERS.map(({ label, bar }) => {
                          const n = bd[label]||0;
                          return n > 0 ? <div key={label} className={`${bar} h-full flex items-center justify-center`} style={{ flex: n }} title={`${label}: ${n}`}><span className="text-[8px] font-black text-white/80">{n}</span></div> : null;
                        })}
                        {bd.noData > 0 && <div className="bg-slate-700 h-full" style={{ flex: bd.noData }} title={`No data: ${bd.noData}`}/>}
                      </div>
                      <div className="mt-1.5 flex gap-3 flex-wrap">
                        {TIERS.map(({ label, color }) => { const n = bd[label]||0; return n > 0 ? <span key={label} className={`text-[9px] font-black ${color}`}>{label} {n}</span> : null; })}
                        {bd.noData > 0 && <span className="text-[9px] text-slate-600">No data {bd.noData}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CLASS VIEW ─────────────────────────────── */}
        {view === 'class' && (
          <div className="space-y-5">
            {/* Class grid */}
            <div className="grid grid-cols-5 gap-3">
              {HP_CLASSES.map(c => {
                const ss = students.filter(s => s.grade===grade && s.class_group===c);
                const tested = ss.filter(s => latest[s.id]).length;
                const isActive = selClass === c;
                return (
                  <button key={c} onClick={() => setSelClass(isActive ? null : c)}
                    className={`rounded-2xl border p-4 text-center transition hover:scale-[1.02] ${isActive ? grade==='Grade 8' ? 'border-sky-500/40 bg-sky-500/10' : 'border-violet-500/40 bg-violet-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                    <p className={`text-3xl font-black ${isActive ? grade==='Grade 8' ? 'text-sky-300' : 'text-violet-300' : 'text-white'}`}>{c}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{tested}/{ss.length} tested</p>
                  </button>
                );
              })}
            </div>

            {selClass && (() => {
              const ss = students.filter(s => s.grade===grade && s.class_group===selClass);
              return (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-white">{grade} · Class {selClass}</h2>
                      <p className="text-xs text-slate-500">{ss.filter(s=>latest[s.id]).length}/{ss.length} students tested</p>
                    </div>
                  </div>
                  {/* Scrollable table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/50">
                          <th className="px-5 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Student</th>
                          {tests.map(t => <th key={t.key} className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">{t.label.replace(' Sprint','').replace(' Broad','').replace(' Jump','').replace(' Run','')}</th>)}
                          <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">Group</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {ss.map(s => {
                          const r = latest[s.id];
                          return (
                            <tr key={s.id} onClick={() => { setSelStudent(s); setView('student'); }}
                              className="cursor-pointer hover:bg-slate-800/30 transition">
                              <td className="px-5 py-3">
                                <p className="text-sm font-semibold text-white">{s.full_name}</p>
                              </td>
                              {tests.map(t => {
                                const val = r ? parseFloat(r[t.key]) : NaN;
                                if (isNaN(val)) return <td key={t.key} className="px-3 py-3 text-center text-slate-700 text-xs">—</td>;
                                const tier = getTier(t.key, val, t.higher);
                                return (
                                  <td key={t.key} className="px-3 py-3 text-center">
                                    <p className={`text-xs font-black ${tier.color}`}>{fmt(t.key,val)}</p>
                                    <p className="text-[9px] text-slate-600">{tier.label}</p>
                                  </td>
                                );
                              })}
                              <td className="px-3 py-3 text-center">
                                {s.training_group
                                  ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${[,'bg-sky-500/15 text-sky-300','bg-violet-500/15 text-violet-300','bg-amber-500/15 text-amber-300','bg-emerald-500/15 text-emerald-300'][s.training_group]||''}`}>G{s.training_group}</span>
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

        {/* ── INDIVIDUAL ────────────────────────────── */}
        {view === 'student' && (
          <div className="space-y-5">
            {!selStudent ? (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {gradeStudents.filter(s => !search || s.full_name.toLowerCase().includes(search.toLowerCase())).map(s => {
                    const r = latest[s.id];
                    const a10 = r ? parseFloat(r.sprint_10m) : NaN;
                    const tier = !isNaN(a10) ? getTier('sprint_10m', a10, false) : null;
                    return (
                      <button key={s.id} onClick={() => setSelStudent(s)}
                        className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-left hover:border-sky-500/30 transition">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300">
                          {s.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{s.full_name}</p>
                          <p className="text-[10px] text-slate-500">Class {s.class_group}{s.training_group ? ` · G${s.training_group}` : ''}</p>
                        </div>
                        {tier && !isNaN(a10) && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.color}`}>{tier.label}</span>}
                        {!r && <span className="shrink-0 text-[9px] text-amber-500">No data</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-5">
                {/* Student header */}
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/30 to-sky-500/10 text-xl font-black text-sky-300">
                    {selStudent.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-black text-white truncate">{selStudent.full_name}</h2>
                    <p className="text-sm text-slate-400">{selStudent.grade} · Class {selStudent.class_group}{selStudent.training_group ? ` · Group ${selStudent.training_group}` : ''}</p>
                  </div>
                  <button onClick={() => setSelStudent(null)} className="shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition">← Back</button>
                </div>

                {(() => {
                  const sResults = results.filter(r => r.student_id === selStudent.id && r.year === selYear);
                  const sTests = TESTS.filter(t => t.grade === selStudent.grade.split(' ')[1] || t.grade === 'both');
                  if (!sResults.length) return (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
                      <p className="text-3xl mb-3">📋</p>
                      <p className="text-slate-400">No test results recorded yet.</p>
                    </div>
                  );

                  // Overall tier summary
                  const termData = TERMS.map(term => sResults.find(r => r.term === term));
                  const latestResult = termData.filter(Boolean).pop();
                  const overallTiers = sTests.map(t => {
                    const v = latestResult ? parseFloat(latestResult[t.key]) : NaN;
                    return isNaN(v) ? null : getTier(t.key, v, t.higher);
                  }).filter(Boolean);
                  const eliteCount = overallTiers.filter(t => t?.label === 'Elite').length;
                  const goodCount  = overallTiers.filter(t => t?.label === 'Good').length;

                  return (
                    <>
                      {/* Summary row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                          <p className="text-3xl font-black text-emerald-400">{eliteCount}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Elite Tests</p>
                        </div>
                        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-center">
                          <p className="text-3xl font-black text-sky-400">{goodCount}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Good Tests</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-center">
                          <p className="text-3xl font-black text-white">{sResults.length}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Terms Tested</p>
                        </div>
                      </div>

                      {/* Test cards */}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sTests.map(t => {
                          const termVals = TERMS.map(term => {
                            const r = sResults.find(r => r.term === term);
                            const v = r ? parseFloat(r[t.key]) : NaN;
                            return isNaN(v) ? null : v;
                          });
                          const latest = termVals.filter((v): v is number => v !== null).pop();
                          const tier = latest !== undefined ? getTier(t.key, latest, t.higher) : null;
                          const hasAny = termVals.some(v => v !== null);

                          return (
                            <div key={t.key} className={`rounded-2xl border p-4 ${tier ? tier.bg.replace('/15','/8') + ' ' + tier.color.replace('text-','border-').replace('-400','-500/30') : 'border-slate-800 bg-slate-900'}`}>
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{t.label}</p>
                                {tier && <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.color}`}>{tier.label}</span>}
                              </div>
                              {latest !== undefined
                                ? <p className={`text-2xl font-black ${tier?.color||'text-white'}`}>{fmt(t.key, latest)}<span className="text-sm ml-1 opacity-50">{t.unit}</span></p>
                                : <p className="text-xl font-black text-slate-700">—</p>
                              }
                              {hasAny && (
                                <>
                                  <div className="mt-3 flex items-center gap-3">
                                    <Spark vals={termVals} higher={t.higher}/>
                                    <div className="flex gap-2">
                                      {TERMS.map((term, i) => (
                                        <div key={term} className="text-center">
                                          <p className="text-[8px] text-slate-600">{term.replace('Term ','T')}</p>
                                          <p className={`text-[10px] font-black ${termVals[i]!==null ? 'text-white' : 'text-slate-700'}`}>{termVals[i]!==null ? fmt(t.key,termVals[i]!) : '—'}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {latest !== undefined && <BenchBar k={t.key} val={latest} higher={t.higher}/>}
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