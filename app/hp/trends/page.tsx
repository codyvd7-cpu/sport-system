'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const HP_CLASSES = ['B','E','F','J','M'];

const TESTS = [
  { key: 'chin_up_hang', label: 'Chin Up Hang', unit: 's', higher: true, grade: '8' },
  { key: 'broad_jump', label: 'Broad Jump', unit: 'cm', higher: true, grade: '8' },
  { key: 'pushup_2min', label: '2 Min Push Up', unit: 'reps', higher: true, grade: '9' },
  { key: 'triple_broad_jump', label: 'Triple Broad Jump', unit: 'cm', higher: true, grade: '9' },
  { key: 'sprint_10m', label: '10m Sprint', unit: 's', higher: false, grade: 'both' },
  { key: 'sprint_30m', label: '30m Sprint', unit: 's', higher: false, grade: 'both' },
  { key: 'run_500m', label: '500m Run', unit: 's', higher: false, grade: 'both' },
];

const BENCHMARKS: Record<string, { elite: number; good: number; avg: number; dev: number; label: string }> = {
  chin_up_hang:     { elite: 60, good: 30, avg: 15, dev: 5,    label: 'Chin Up Hang' },
  broad_jump:       { elite: 200, good: 175, avg: 155, dev: 135, label: 'Broad Jump' },
  pushup_2min:      { elite: 20, good: 14, avg: 10, dev: 6,    label: 'Push Ups' },
  triple_broad_jump:{ elite: 700, good: 600, avg: 520, dev: 450, label: 'Triple Broad' },
  sprint_10m:       { elite: 2.10, good: 2.30, avg: 2.50, dev: 2.70, label: '10m Sprint' },
  sprint_30m:       { elite: 4.60, good: 5.00, avg: 5.40, dev: 5.80, label: '30m Sprint' },
  run_500m:         { elite: 100, good: 120, avg: 140, dev: 160, label: '500m Run' },
};

function getTier(key: string, value: number, higher: boolean) {
  const b = BENCHMARKS[key];
  if (!b) return { label: '—', color: 'text-slate-500', bg: 'bg-slate-800' };
  if (higher) {
    if (value >= b.elite) return { label: 'Elite', color: 'text-emerald-400', bg: 'bg-emerald-500/15' };
    if (value >= b.good)  return { label: 'Good',  color: 'text-sky-400',     bg: 'bg-sky-500/15' };
    if (value >= b.avg)   return { label: 'Avg',   color: 'text-amber-400',   bg: 'bg-amber-500/15' };
    if (value >= b.dev)   return { label: 'Dev',   color: 'text-orange-400',  bg: 'bg-orange-500/15' };
    return { label: 'Poor', color: 'text-red-400', bg: 'bg-red-500/15' };
  } else {
    if (value <= b.elite) return { label: 'Elite', color: 'text-emerald-400', bg: 'bg-emerald-500/15' };
    if (value <= b.good)  return { label: 'Good',  color: 'text-sky-400',     bg: 'bg-sky-500/15' };
    if (value <= b.avg)   return { label: 'Avg',   color: 'text-amber-400',   bg: 'bg-amber-500/15' };
    if (value <= b.dev)   return { label: 'Dev',   color: 'text-orange-400',  bg: 'bg-orange-500/15' };
    return { label: 'Poor', color: 'text-red-400', bg: 'bg-red-500/15' };
  }
}

function Sparkline({ values, higher }: { values: (number | null)[]; higher: boolean }) {
  const valid = values.filter(v => v !== null) as number[];
  if (valid.length < 2) return <span className="text-[10px] text-slate-600">—</span>;
  const min = Math.min(...valid), max = Math.max(...valid), range = max - min || 1;
  const W = 64, H = 24;
  const pts = values.map((v, i) => v !== null ? `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * (H - 2) - 1}` : null).filter(Boolean).join(' ');
  const last = valid[valid.length - 1], first = valid[0];
  const improved = higher ? last > first : last < first;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-16" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={improved ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(values.length - 1) / (values.length - 1) * W} cy={H - ((last - min) / range) * (H - 2) - 1} r="2" fill={improved ? '#10b981' : '#ef4444'} />
    </svg>
  );
}

function formatVal(key: string, val: number): string {
  if (key === 'run_500m') {
    const m = Math.floor(val / 60), s = Math.round(val % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  if (key === 'chin_up_hang') {
    if (val >= 60) { const m = Math.floor(val / 60), s = val % 60; return s > 0 ? `${m}m${s}s` : `${m}min`; }
    return `${val}s`;
  }
  return val % 1 === 0 ? String(val) : val.toFixed(2);
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-0.5 text-xs font-black text-white/70">{label}</p>
      {sub && <p className="text-[10px] text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function HPTrendsPage() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<'overview' | 'class' | 'individual'>('overview');
  const [selectedGrade, setSelectedGrade] = React.useState<'Grade 8' | 'Grade 9'>('Grade 8');
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<Row | null>(null);
  const [selectedTest, setSelectedTest] = React.useState('sprint_10m');

  React.useEffect(() => {
    async function load() {
      const [sRes, rRes] = await Promise.all([
        supabase.from('hp_students').select('*').eq('is_active', true).order('grade').order('full_name'),
        supabase.from('hp_test_results').select('*').order('year').order('term'),
      ]);
      setStudents(sRes.data || []);
      setResults(rRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const TERMS = ['Term 1', 'Term 2', 'Term 3'];

  // Get latest result per student
  function getLatest(studentId: string) {
    const rs = results.filter(r => r.student_id === studentId);
    return rs[rs.length - 1] || null;
  }

  function getClassStudents(grade: string, cls: string) {
    return students.filter(s => s.grade === grade && s.class_group === cls);
  }

  function classAvg(grade: string, cls: string, testKey: string) {
    const ss = getClassStudents(grade, cls);
    const vals = ss.map(s => {
      const r = getLatest(s.id);
      return r ? parseFloat(r[testKey]) : null;
    }).filter(v => v !== null && !isNaN(v as number)) as number[];
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function gradeAvg(grade: string, testKey: string) {
    const ss = students.filter(s => s.grade === grade);
    const vals = ss.map(s => {
      const r = getLatest(s.id);
      return r ? parseFloat(r[testKey]) : null;
    }).filter(v => v !== null && !isNaN(v as number)) as number[];
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function tierBreakdown(grade: string, cls: string | null, testKey: string, higher: boolean) {
    const ss = cls ? getClassStudents(grade, cls) : students.filter(s => s.grade === grade);
    const counts = { Elite: 0, Good: 0, Avg: 0, Dev: 0, Poor: 0, noData: 0 };
    ss.forEach(s => {
      const r = getLatest(s.id);
      const val = r ? parseFloat(r[testKey]) : null;
      if (val === null || isNaN(val)) { counts.noData++; return; }
      const tier = getTier(testKey, val, higher).label;
      if (tier in counts) (counts as any)[tier]++;
    });
    return { ...counts, total: ss.length };
  }

  const grade8Tests = TESTS.filter(t => t.grade === '8' || t.grade === 'both');
  const grade9Tests = TESTS.filter(t => t.grade === '9' || t.grade === 'both');
  const currentTests = selectedGrade === 'Grade 8' ? grade8Tests : grade9Tests;
  const selectedTestObj = TESTS.find(t => t.key === selectedTest) || TESTS[4];

  if (loading) return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-slate-900 animate-pulse" />)}</div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">High Performance</p>
          <h1 className="mt-1 text-3xl font-black text-white">Trends & Analytics</h1>
        </div>

        {/* View toggle */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {(['overview', 'class', 'individual'] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setSelectedStudent(null); }}
              className={`rounded-xl px-4 py-2 text-sm font-black capitalize transition ${view === v ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
              {v === 'overview' ? '📊 Overview' : v === 'class' ? '📚 Class View' : '👤 Individual'}
            </button>
          ))}
          <div className="flex gap-1.5 ml-2">
            {(['Grade 8', 'Grade 9'] as const).map(g => (
              <button key={g} onClick={() => setSelectedGrade(g)}
                className={`rounded-xl px-3 py-2 text-xs font-black transition ${selectedGrade === g ? g === 'Grade 8' ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300' : 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {view === 'overview' && (
          <div className="space-y-6">
            {/* Grade stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(() => {
                const ss = students.filter(s => s.grade === selectedGrade);
                const tested = ss.filter(s => getLatest(s.id));
                const avg10 = gradeAvg(selectedGrade, 'sprint_10m');
                const avg500 = gradeAvg(selectedGrade, 'run_500m');
                return (
                  <>
                    <StatCard label="Students" value={ss.length} color="border-sky-500/20 bg-sky-500/5" />
                    <StatCard label="Tested" value={tested.length} sub={`${Math.round(tested.length/ss.length*100)}% complete`} color="border-emerald-500/20 bg-emerald-500/5" />
                    <StatCard label="Avg 10m" value={avg10 ? avg10.toFixed(2)+'s' : '—'} color="border-violet-500/20 bg-violet-500/5" />
                    <StatCard label="Avg 500m" value={avg500 ? formatVal('run_500m', avg500) : '—'} color="border-amber-500/20 bg-amber-500/5" />
                  </>
                );
              })()}
            </div>

            {/* Test selector */}
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Select Test to Analyse</p>
              <div className="flex flex-wrap gap-2">
                {currentTests.map(t => (
                  <button key={t.key} onClick={() => setSelectedTest(t.key)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${selectedTest === t.key ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Class comparison for selected test */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-5 text-lg font-black text-white">{selectedTestObj.label} — Class Comparison</h2>
              <div className="space-y-3">
                {HP_CLASSES.map(c => {
                  const avg = classAvg(selectedGrade, c, selectedTest);
                  const ss = getClassStudents(selectedGrade, c);
                  const breakdown = tierBreakdown(selectedGrade, c, selectedTest, selectedTestObj.higher);
                  if (ss.length === 0) return null;
                  const tier = avg !== null ? getTier(selectedTest, avg, selectedTestObj.higher) : null;
                  const pctTested = Math.round((ss.length - breakdown.noData) / ss.length * 100);
                  return (
                    <div key={c} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black ${selectedGrade === 'Grade 8' ? 'bg-sky-500/15 text-sky-300' : 'bg-violet-500/15 text-violet-300'}`}>{c}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-black text-white">Class {c}</p>
                            {tier && avg !== null && (
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${tier.bg} ${tier.color}`}>{tier.label}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{ss.length} students · {pctTested}% tested · Avg: {avg !== null ? formatVal(selectedTest, avg) + selectedTestObj.unit : '—'}</p>
                        </div>
                      </div>
                      {/* Tier bar */}
                      <div className="flex h-2 w-full overflow-hidden rounded-full gap-0.5">
                        {[
                          { key: 'Elite', color: 'bg-emerald-500' },
                          { key: 'Good', color: 'bg-sky-500' },
                          { key: 'Avg', color: 'bg-amber-500' },
                          { key: 'Dev', color: 'bg-orange-500' },
                          { key: 'Poor', color: 'bg-red-500' },
                        ].map(({ key, color }) => {
                          const count = (breakdown as any)[key] || 0;
                          const pct = (count / ss.length) * 100;
                          return pct > 0 ? <div key={key} className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} title={`${key}: ${count}`} /> : null;
                        })}
                      </div>
                      <div className="mt-1.5 flex gap-3 flex-wrap">
                        {[
                          { key: 'Elite', color: 'text-emerald-400' },
                          { key: 'Good', color: 'text-sky-400' },
                          { key: 'Avg', color: 'text-amber-400' },
                          { key: 'Dev', color: 'text-orange-400' },
                          { key: 'Poor', color: 'text-red-400' },
                        ].map(({ key, color }) => {
                          const count = (breakdown as any)[key] || 0;
                          return count > 0 ? <span key={key} className={`text-[10px] font-black ${color}`}>{key} {count}</span> : null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CLASS VIEW ── */}
        {view === 'class' && (
          <div className="space-y-5">
            {/* Class selector */}
            <div className="grid grid-cols-5 gap-3">
              {HP_CLASSES.map(c => {
                const key = `${selectedGrade === 'Grade 8' ? '8' : '9'}${c}`;
                const ss = getClassStudents(selectedGrade, c);
                return (
                  <button key={c} onClick={() => setSelectedClass(selectedClass === c ? null : c)}
                    className={`rounded-2xl border p-4 text-center transition hover:scale-[1.03] ${selectedClass === c ? selectedGrade === 'Grade 8' ? 'border-sky-500/50 bg-sky-500/15' : 'border-violet-500/50 bg-violet-500/15' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                    <p className={`text-2xl font-black ${selectedClass === c ? selectedGrade === 'Grade 8' ? 'text-sky-300' : 'text-violet-300' : 'text-white'}`}>{c}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{ss.length} students</p>
                  </button>
                );
              })}
            </div>

            {selectedClass && (() => {
              const ss = getClassStudents(selectedGrade, selectedClass);
              return (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  {/* Header */}
                  <div className="border-b border-slate-800 px-5 py-4">
                    <h2 className="text-lg font-black text-white">{selectedGrade} Class {selectedClass}</h2>
                    <p className="text-xs text-slate-500">{ss.length} students · Term 1 2026</p>
                  </div>
                  {/* Table header */}
                  <div className="grid border-b border-slate-800 bg-slate-950/50 px-5 py-2.5" style={{ gridTemplateColumns: '1fr repeat(5, 80px) 60px' }}>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Student</p>
                    {currentTests.slice(0, 5).map(t => (
                      <p key={t.key} className="text-[10px] font-black uppercase tracking-wide text-slate-500 text-center">{t.label.split(' ')[0]}</p>
                    ))}
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 text-center">Group</p>
                  </div>
                  {/* Rows */}
                  <div className="divide-y divide-slate-800/50">
                    {ss.map(s => {
                      const r = getLatest(s.id);
                      return (
                        <button key={s.id} onClick={() => { setSelectedStudent(s); setView('individual'); }}
                          className="grid w-full items-center px-5 py-3 text-left hover:bg-slate-800/30 transition" style={{ gridTemplateColumns: '1fr repeat(5, 80px) 60px' }}>
                          <div>
                            <p className="text-sm font-semibold text-white">{s.full_name}</p>
                          </div>
                          {currentTests.slice(0, 5).map(t => {
                            const val = r ? parseFloat(r[t.key]) : null;
                            if (val === null || isNaN(val)) return <div key={t.key} className="text-center text-slate-700 text-xs">—</div>;
                            const tier = getTier(t.key, val, t.higher);
                            return (
                              <div key={t.key} className="text-center">
                                <p className={`text-xs font-black ${tier.color}`}>{formatVal(t.key, val)}</p>
                                <p className="text-[9px] text-slate-600">{tier.label}</p>
                              </div>
                            );
                          })}
                          <div className="text-center">
                            {s.training_group
                              ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${s.training_group === 1 ? 'bg-sky-500/15 text-sky-300' : s.training_group === 2 ? 'bg-violet-500/15 text-violet-300' : s.training_group === 3 ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>G{s.training_group}</span>
                              : <span className="text-slate-700 text-xs">—</span>
                            }
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── INDIVIDUAL ── */}
        {view === 'individual' && (
          <div className="space-y-5">
            {/* Student selector */}
            {!selectedStudent ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="mb-4 text-sm text-slate-400">Select a student to view their profile</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {students.filter(s => s.grade === selectedGrade).map(s => (
                    <button key={s.id} onClick={() => setSelectedStudent(s)}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-left hover:border-sky-500/30 transition">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-300">
                        {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{s.full_name}</p>
                        <p className="text-[10px] text-slate-500">{s.grade} · Class {s.class_group}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Student header */}
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-xl font-black text-emerald-300">
                    {selectedStudent.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{selectedStudent.full_name}</h2>
                    <p className="text-sm text-slate-400">{selectedStudent.grade} · Class {selectedStudent.class_group}
                      {selectedStudent.training_group ? ` · Group ${selectedStudent.training_group}` : ''}
                    </p>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="ml-auto rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition">← Back</button>
                </div>

                {/* Test results across terms */}
                {(() => {
                  const studentResults = results.filter(r => r.student_id === selectedStudent.id);
                  const sTests = selectedStudent.grade === 'Grade 9' ? grade9Tests : grade8Tests;
                  if (studentResults.length === 0) return (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                      <p className="text-slate-500">No test results recorded yet.</p>
                    </div>
                  );
                  return (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {sTests.map(t => {
                        const termVals = TERMS.map(term => {
                          const r = studentResults.find(r => r.term === term);
                          const v = r ? parseFloat(r[t.key]) : null;
                          return v !== null && !isNaN(v) ? v : null;
                        });
                        const latest = termVals.filter(v => v !== null).pop();
                        const tier = latest !== null && latest !== undefined ? getTier(t.key, latest, t.higher) : null;
                        return (
                          <div key={t.key} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{t.label}</p>
                                {latest !== null && latest !== undefined && (
                                  <p className={`text-2xl font-black mt-0.5 ${tier?.color}`}>{formatVal(t.key, latest)}<span className="text-sm ml-1 text-slate-500">{t.unit}</span></p>
                                )}
                              </div>
                              {tier && <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${tier.bg} ${tier.color}`}>{tier.label}</span>}
                            </div>
                            <Sparkline values={termVals} higher={t.higher} />
                            <div className="mt-2 grid grid-cols-3 gap-1">
                              {TERMS.map((term, i) => (
                                <div key={term} className="text-center">
                                  <p className="text-[9px] text-slate-600">{term.replace('Term ', 'T')}</p>
                                  <p className="text-xs font-black text-white">{termVals[i] !== null ? formatVal(t.key, termVals[i]!) : '—'}</p>
                                </div>
                              ))}
                            </div>
                            {/* Benchmark bar */}
                            {latest !== null && latest !== undefined && BENCHMARKS[t.key] && (() => {
                              const b = BENCHMARKS[t.key];
                              const benchmarks = t.higher
                                ? [b.dev, b.avg, b.good, b.elite]
                                : [b.elite, b.good, b.avg, b.dev];
                              const min = Math.min(...benchmarks), max = Math.max(...benchmarks);
                              const pct = Math.min(100, Math.max(0, ((latest - min) / (max - min)) * 100));
                              const adjustedPct = t.higher ? pct : 100 - pct;
                              return (
                                <div className="mt-3">
                                  <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 via-sky-500 to-emerald-500 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-slate-800" style={{ left: `${adjustedPct}%` }} />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
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