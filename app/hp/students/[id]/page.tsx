'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ id: string }> };

const GRADE8_TESTS = [
  { key: 'chin_up_hang',  label: 'Chin Up Hang',  unit: 's',   lower: false },
  { key: 'broad_jump',    label: 'Broad Jump',     unit: 'cm',  lower: false },
  { key: 'sprint_10m',    label: '10m Sprint',     unit: 's',   lower: true  },
  { key: 'sprint_30m',    label: '30m Sprint',     unit: 's',   lower: true  },
  { key: 'run_500m',      label: '500m Run',       unit: '',    lower: true  },
];

const GRADE9_TESTS = [
  { key: 'pushup_2min',       label: '2 Min Push Up',     unit: 'reps', lower: false },
  { key: 'triple_broad_jump', label: 'Triple Broad Jump', unit: 'cm',   lower: false },
  { key: 'sprint_10m',        label: '10m Sprint',        unit: 's',    lower: true  },
  { key: 'sprint_30m',        label: '30m Sprint',        unit: 's',    lower: true  },
  { key: 'run_500m',          label: '500m Run',          unit: '',     lower: true  },
];

// Research-based benchmarks [Outstanding, Strong, On Track, Developing, Needs Work]
const BENCH: Record<string, [number,number,number,number]> = {
  chin_up_hang:      [45, 25, 12, 5],
  broad_jump:        [185, 165, 148, 130],
  pushup_2min:       [22, 18, 14, 10],
  triple_broad_jump: [680, 600, 530, 460],
  sprint_10m:        [1.85, 1.97, 2.10, 2.25],
  sprint_30m:        [4.25, 4.52, 4.80, 5.10],
  run_500m:          [100, 115, 130, 150],
};

const TIERS = [
  { label: 'Outstanding', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', bar: 'bg-emerald-500' },
  { label: 'Strong',      color: 'text-sky-400',     bg: 'bg-sky-500/15',     border: 'border-sky-500/30',     bar: 'bg-sky-500'     },
  { label: 'On Track',    color: 'text-violet-400',  bg: 'bg-violet-500/15',  border: 'border-violet-500/30',  bar: 'bg-violet-500'  },
  { label: 'Developing',  color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   bar: 'bg-amber-500'   },
  { label: 'Needs Work',  color: 'text-slate-400',   bg: 'bg-slate-500/15',   border: 'border-slate-500/30',   bar: 'bg-slate-500'   },
];

function getTier(key: string, val: number, lower: boolean) {
  const b = BENCH[key]; if (!b) return null;
  const [e,g,a,d] = b;
  if (lower) {
    if (val <= e) return TIERS[0]; if (val <= g) return TIERS[1];
    if (val <= a) return TIERS[2]; if (val <= d) return TIERS[3]; return TIERS[4];
  } else {
    if (val >= e) return TIERS[0]; if (val >= g) return TIERS[1];
    if (val >= a) return TIERS[2]; if (val >= d) return TIERS[3]; return TIERS[4];
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

function BenchBar({ k, val, lower }: { k: string; val: number; lower: boolean }) {
  const b = BENCH[k]; if (!b) return null;
  const [e,g,a,d] = lower ? [...b].reverse() as [number,number,number,number] : b;
  const min = Math.min(e,g,a,d), max = Math.max(e,g,a,d);
  const pct = Math.min(96, Math.max(4, ((val - min) / (max - min)) * 100));
  return (
    <div className="mt-2 relative h-2">
      <div className="absolute inset-0 flex rounded-full overflow-hidden">
        <div className="flex-1 bg-red-500/40"/>
        <div className="flex-1 bg-orange-500/40"/>
        <div className="flex-1 bg-amber-500/40"/>
        <div className="flex-1 bg-sky-500/40"/>
        <div className="flex-1 bg-emerald-500/40"/>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-white shadow-lg"
        style={{ left: `calc(${pct}% - 7px)` }} />
    </div>
  );
}

function Sparkline({ vals, lower }: { vals: (number|null)[]; lower: boolean }) {
  const v = vals.filter((x): x is number => x !== null);
  if (v.length < 2) return null;
  const mn = Math.min(...v), mx = Math.max(...v), rng = mx - mn || 1;
  const W = 60, H = 20;
  const improved = lower ? v[v.length-1] < v[0] : v[v.length-1] > v[0];
  const pts = vals.map((x,i) => x!==null ? `${(i/(vals.length-1))*W},${H-2-((x-mn)/rng)*(H-4)}` : null).filter(Boolean).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-5 w-15" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={improved?'#10b981':'#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const TERMS = ['Term 1','Term 2','Term 3'];

export default function HPStudentProfile({ params }: PageProps) {
  const { id } = React.use(params);
  const [student, setStudent] = React.useState<Row|null>(null);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [attTab, setAttTab] = React.useState<'summary'|'history'>('summary');
  const [selectedYear, setSelectedYear] = React.useState(() => new Date().getFullYear());
  const [loadError, setLoadError] = React.useState<string|null>(null);
  const [aiSummary, setAiSummary] = React.useState<string|null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiTerm, setAiTerm] = React.useState(() => {
    const m = new Date().getMonth() + 1;
    if (m <= 3) return 'Term 1'; if (m <= 6) return 'Term 2';
    if (m <= 9) return 'Term 3'; return 'Full Year';
  });

  React.useEffect(() => {
    async function load() {
      const [sRes, aRes, rRes] = await Promise.all([
        supabase.from('hp_students').select('*').eq('id', id).single(),
        supabase.from('hp_attendance').select('*').eq('student_id', id).order('session_date', { ascending: false }),
        supabase.from('hp_test_results').select('*').eq('student_id', id).order('year').order('term'),
      ]);
      if (sRes.error) { setLoadError(`Could not load student: ${sRes.error.message}`); setLoading(false); return; }
      if (aRes.error) setLoadError(`Attendance error: ${aRes.error.message}`);
      if (rRes.error) setLoadError(`Results error: ${rRes.error.message}`);
      setStudent(sRes.data);
      setAttendance(aRes.data || []);
      setResults(rRes.data || []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function generateAiSummary() {
    if (!student) return;
    setAiLoading(true);
    setAiSummary(null);
    const termResults = results.filter(r => r.year === selectedYear && (aiTerm === 'Full Year' || r.term === aiTerm));
    const latest = termResults[termResults.length - 1] || null;
    const tests = student.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
    const attRate = attendance.length > 0 ? Math.round((attendance.filter(a => ['Present','Late'].includes(a.status)).length / attendance.length) * 100) : null;

    const testLines = latest ? tests.map(t => {
      const v = parseFloat(latest[t.key]);
      if (isNaN(v)) return null;
      const tier = getTier(t.key, v, t.lower);
      return `${t.label}: ${fmt(t.key, v)}${t.unit} (${tier?.label || 'N/A'})`;
    }).filter(Boolean).join('\n') : 'No test results recorded.';

    const t1 = results.find(r => r.year === selectedYear && r.term === 'Term 1');
    const t2 = results.find(r => r.year === selectedYear && r.term === 'Term 2');
    const improvements = t1 && t2 ? tests.map(t => {
      const v1 = parseFloat(t1[t.key]), v2 = parseFloat(t2[t.key]);
      if (isNaN(v1) || isNaN(v2)) return null;
      const improved = t.lower ? v2 < v1 : v2 > v1;
      const pct = Math.abs(((v2 - v1) / v1) * 100).toFixed(1);
      return improved ? `${t.label} improved by ${pct}%` : null;
    }).filter(Boolean).join(', ') : null;

    const prompt = `You are an HP (high performance) sport coach at St Benedict's College in South Africa. Write a concise, encouraging, professional end-of-${aiTerm} summary for the following student. Be specific about their results, highlight strengths, mention what to work on, and keep it to 3-4 sentences maximum. Do not use bullet points. Use their first name.

Student: ${student.full_name}
Grade: ${student.grade}
Training Group: ${student.training_group ? `Group ${student.training_group}` : 'Not assigned'}
Attendance Rate: ${attRate !== null ? `${attRate}%` : 'No data'}
Sessions attended: ${attendance.filter(a => ['Present','Late'].includes(a.status)).length} of ${attendance.length}

${aiTerm} Test Results (${selectedYear}):
${testLines}
${improvements ? `\nKey improvements (Term 1 → Term 2): ${improvements}` : ''}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((c: any) => c.text || '').join('') || 'Could not generate summary.';
      setAiSummary(text);
    } catch {
      setAiSummary('Failed to generate summary. Please try again.');
    }
    setAiLoading(false);
  }
    <main className="flex min-h-screen items-center justify-center bg-[#030810]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"/>
    </main>
  );
  if (!student) return (
    <main className="flex min-h-screen items-center justify-center bg-[#030810] text-white">
      <p>Student not found</p>
    </main>
  );

  const tests = student.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
  const present = attendance.filter(a => ['Present','Late'].includes(a.status)).length;
  const attRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;

  const yearResults = results.filter(r => r.year === selectedYear);
  const latest = yearResults[yearResults.length - 1] || null;

  // Overall tier summary from latest
  const tierCounts = { Outstanding:0, Strong:0, 'On Track':0, Developing:0, 'Needs Work':0 };
  if (latest) {
    tests.forEach(t => {
      const v = parseFloat(latest[t.key]);
      if (!isNaN(v)) {
        const tier = getTier(t.key, v, t.lower);
        if (tier) (tierCounts as any)[tier.label]++;
      }
    });
  }

  return (
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/hp/students" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← Students</Link>

        {loadError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            ⚠ {loadError}
          </div>
        )}

        {/* Hero */}
        <div className="mb-8 flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-xl font-black text-emerald-300">
            {student.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">High Performance</p>
            <h1 className="mt-0.5 text-3xl font-black text-white truncate">{student.full_name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">{student.grade}</span>
              {student.class_group && <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">Class {student.class_group}</span>}
              {student.training_group && <span className={`rounded-full px-3 py-1 text-xs font-black ${student.training_group===1?'bg-sky-500/15 text-sky-300':student.training_group===2?'bg-violet-500/15 text-violet-300':student.training_group===3?'bg-amber-500/15 text-amber-300':'bg-emerald-500/15 text-emerald-300'}`}>Group {student.training_group}</span>}
              {attRate !== null && <span className={`rounded-full px-3 py-1 text-xs font-black ${attRate>=80?'bg-emerald-500/15 text-emerald-300':attRate>=60?'bg-amber-500/15 text-amber-300':'bg-red-500/15 text-red-300'}`}>{attRate}% attendance</span>}
            </div>
          </div>
        </div>

        {/* Summary strip */}
        {latest && (
          <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {Object.entries(tierCounts).map(([tier, count]) => {
              const t = TIERS.find(x => x.label === tier)!;
              return count > 0 ? (
                <div key={tier} className={`rounded-2xl border p-3 text-center ${t.bg} ${t.border}`}>
                  <p className={`text-2xl font-black ${t.color}`}>{count}</p>
                  <p className="text-[10px] font-semibold text-white/50 mt-0.5">{tier}</p>
                </div>
              ) : null;
            }).filter(Boolean)}
          </div>
        )}

        {/* Test results */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-black text-white">Test Results</h2>
              <p className="text-xs text-slate-500 mt-0.5">{student.grade} battery · {yearResults.length} term{yearResults.length !== 1 ? 's' : ''} recorded</p>
            </div>
            <div className="flex gap-1.5">
              {[2025, 2026, 2027].map(y => (
                <button key={y} onClick={() => setSelectedYear(y)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${selectedYear === y ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                  {y}
                </button>
              ))}
            </div>
          </div>

          {yearResults.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-slate-500 text-sm">No test results recorded for {selectedYear}.</p>
            </div>
          ) : (
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {tests.map(t => {
                const termVals = TERMS.map(term => {
                  const r = yearResults.find(r => r.term === term);
                  const v = r ? parseFloat(r[t.key]) : NaN;
                  return isNaN(v) ? null : v;
                });
                const latestVal = termVals.filter((v): v is number => v !== null).pop();
                const tier = latestVal !== undefined ? getTier(t.key, latestVal, t.lower) : null;

                return (
                  <div key={t.key} className={`rounded-2xl border p-4 ${tier ? `${tier.bg} ${tier.border}` : 'border-slate-800 bg-slate-950/40'}`}>
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{t.label}</p>
                      {tier && <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.color}`}>{tier.label}</span>}
                    </div>
                    {latestVal !== undefined
                      ? <p className={`text-2xl font-black ${tier?.color||'text-white'}`}>{fmt(t.key, latestVal)}<span className="text-sm ml-1 opacity-40">{t.unit}</span></p>
                      : <p className="text-2xl font-black text-slate-700">—</p>
                    }
                    {/* Term breakdown */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex gap-2">
                        {TERMS.map((term, i) => (
                          <div key={term} className="text-center">
                            <p className="text-[8px] text-slate-600">{term.replace('Term ','T')}</p>
                            <p className="text-[10px] font-black text-white">{termVals[i] !== null ? fmt(t.key, termVals[i]!) : '—'}</p>
                          </div>
                        ))}
                      </div>
                      <Sparkline vals={termVals} lower={t.lower} />
                    </div>
                    {latestVal !== undefined && <BenchBar k={t.key} val={latestVal} lower={t.lower} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attendance */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Attendance</h2>
              <p className="text-xs text-slate-500 mt-0.5">{attendance.length} sessions · {present} present</p>
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-700 bg-slate-800 p-0.5">
              {(['summary','history'] as const).map(tab => (
                <button key={tab} onClick={() => setAttTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black capitalize transition ${attTab===tab ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {attTab === 'summary' ? (
            <div className="p-5">
              {attendance.length === 0 ? (
                <p className="text-sm text-slate-500">No attendance recorded yet.</p>
              ) : (
                <>
                  {/* Attendance ring */}
                  <div className="flex items-center gap-6 mb-5">
                    <div className="relative h-20 w-20 shrink-0">
                      <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3"/>
                        <circle cx="18" cy="18" r="15.9" fill="none"
                          stroke={attRate!==null&&attRate>=80?'#10b981':attRate!==null&&attRate>=60?'#f59e0b':'#ef4444'}
                          strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${attRate||0} ${100-(attRate||0)}`}/>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className={`text-lg font-black ${attRate!==null&&attRate>=80?'text-emerald-400':attRate!==null&&attRate>=60?'text-amber-400':'text-red-400'}`}>{attRate}%</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Present', val: attendance.filter(a=>a.status==='Present').length, color: 'text-emerald-400' },
                        { label: 'Late',    val: attendance.filter(a=>a.status==='Late').length,    color: 'text-amber-400' },
                        { label: 'Absent',  val: attendance.filter(a=>a.status==='Absent').length,  color: 'text-red-400' },
                        { label: 'Excused', val: attendance.filter(a=>a.status==='Excused').length, color: 'text-sky-400' },
                      ].filter(x => x.val > 0).map(x => (
                        <div key={x.label} className="flex items-center gap-3">
                          <span className={`text-sm font-black ${x.color} w-8 text-right`}>{x.val}</span>
                          <span className="text-xs text-slate-500">{x.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50">
              {attendance.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No attendance recorded yet.</p>
              ) : attendance.map(a => {
                const cls = a.status==='Present'?'bg-emerald-500/15 text-emerald-300':a.status==='Late'?'bg-amber-500/15 text-amber-300':a.status==='Absent'?'bg-red-500/15 text-red-300':'bg-sky-500/15 text-sky-300';
                return (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ${cls}`}>{a.status}</span>
                    <p className="flex-1 text-xs text-slate-400">{a.session_type}</p>
                    <p className="text-[10px] text-slate-600">{new Date(a.session_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* AI Term Summary */}
        <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
          <div className="border-b border-violet-500/15 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span className="text-lg">✦</span> AI Performance Summary
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Generate a coach-ready summary for any term</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-xl border border-slate-700 bg-slate-900 p-0.5">
                {(['Term 1','Term 2','Term 3','Full Year'] as const).map(t => (
                  <button key={t} onClick={() => setAiTerm(t)}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${aiTerm === t ? 'bg-violet-500/30 text-violet-300' : 'text-slate-500 hover:text-white'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={generateAiSummary} disabled={aiLoading}
                className="rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2 text-xs font-black text-violet-300 hover:bg-violet-500/25 transition disabled:opacity-50 flex items-center gap-2">
                {aiLoading ? (
                  <><div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent"/>Generating...</>
                ) : (
                  <>Generate {aiTerm} Summary</>
                )}
              </button>
            </div>
          </div>
          <div className="px-5 py-4">
            {aiSummary ? (
              <div>
                <p className="text-sm leading-relaxed text-slate-200">{aiSummary}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(aiSummary); }}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-white transition">
                    Copy
                  </button>
                  <button onClick={() => setAiSummary(null)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-white transition">
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Select a term above and hit Generate — the AI will produce a short, personalised summary covering test results, attendance, improvements and areas to focus on.
              </p>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}