'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';

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
  { key: 'pushup_2min',       label: 'Push Up (2 min)',     unit: 'reps', lower: false },
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
  pushup_hold:       [90, 70, 50, 30],
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
  { label: 'Needs Work',  color: 'text-white/50',   bg: 'bg-slate-500/15',   border: 'border-slate-500/30',   bar: 'bg-slate-500'   },
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
  if (v.length < 1) return null;
  const W = 60, H = 20;
  if (v.length === 1) return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-5 w-15">
      <circle cx={W/2} cy={H/2} r="2.5" fill="rgba(255,255,255,0.3)"/>
    </svg>
  );
  const mn = Math.min(...v), mx = Math.max(...v), rng = mx - mn || 1;
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
      const res = await fetch(`/api/hp/data?type=student&id=${id}&year=${new Date().getFullYear()}`, { credentials: 'include' });
      if (!res.ok) { setLoadError('Could not load student.'); setLoading(false); return; }
      const d = await res.json();
      if (!d.student) { setLoadError('Student not found.'); setLoading(false); return; }
      setStudent(d.student);
      setAttendance(d.attendance || []);
      setResults(d.tests || []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function generateAiSummary() {
    if (!student) return;
    setAiLoading(true);
    setAiSummary(null);
    const tests = student.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
    const attRate = attendance.length > 0 ? Math.round((attendance.filter(a => ['Present','Late'].includes(a.status)).length / attendance.length) * 100) : null;

    // Build full term-by-term breakdown per test
    const t1 = results.find(r => r.year === selectedYear && r.term === 'Term 1');
    const t2 = results.find(r => r.year === selectedYear && r.term === 'Term 2');
    const t3 = results.find(r => r.year === selectedYear && r.term === 'Term 3');
    const termRefs = [
      { label: 'Term 1', r: t1 },
      { label: 'Term 2', r: t2 },
      { label: 'Term 3', r: t3 },
    ].filter(x => x.r);

    const testBreakdown = tests.map(t => {
      const termVals = termRefs.map(({ label, r }) => {
        const v = parseFloat(r![t.key]);
        if (isNaN(v)) return null;
        const tier = getTier(t.key, v, t.lower);
        return `${label}: ${fmt(t.key, v)}${t.unit} (${tier?.label})`;
      }).filter(Boolean);
      if (!termVals.length) return null;

      // Delta T1 → latest
      const v1 = t1 ? parseFloat(t1[t.key]) : NaN;
      const latest = [t3, t2, t1].find(r => r && !isNaN(parseFloat(r![t.key])));
      const vLatest = latest ? parseFloat(latest[t.key]) : NaN;
      let deltaStr = '';
      if (!isNaN(v1) && !isNaN(vLatest) && v1 !== vLatest) {
        const improved = t.lower ? vLatest < v1 : vLatest > v1;
        const pct = Math.abs(((vLatest - v1) / v1) * 100).toFixed(1);
        deltaStr = improved ? ` → improved ${pct}%` : ` → declined ${pct}%`;
      }
      return `${t.label}: ${termVals.join(' | ')}${deltaStr}`;
    }).filter(Boolean).join('\n');

    const prompt = `You are an HP (high performance) sport coach at St Benedict\u2019s College in South Africa writing an end-of-${aiTerm} athlete report.\n\nWrite 4-5 sentences. You MUST quote specific numbers and percentages from the data below. Mention which tests improved and by how much. Mention any declines honestly but constructively. Reference the attendance rate. End with a forward-looking development focus sentence. Do not use bullet points. Use the student\u2019s first name throughout.

Student First Name: ${student.full_name.trim().split(' ')[0] || 'The student'}
Grade: ${student.grade}
Training Group: ${student.training_group ? `Group ${student.training_group}` : 'Not assigned'}
Attendance: ${attRate !== null ? `${attRate}% (${attendance.filter(a => ['Present','Late'].includes(a.status)).length} of ${attendance.length} sessions)` : 'No data'}

Test Results by Term (${selectedYear}):
${testBreakdown || 'No results recorded yet.'}`;
    try {
      const res = await fetch('/api/hp-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hp-access': 'true',
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.error) { setAiSummary(`Error: ${data.error}`); setAiLoading(false); return; }
      setAiSummary(data.text || 'Could not generate summary.');
    } catch (e: any) {
      setAiSummary(`Error: ${e.message || 'Failed to reach server.'}`);
    }
    setAiLoading(false);
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center pt-14 lg:pt-0" style={{background:'#060c1a'}}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"/>
    </main>
  );
  if (!student) return (
    <main className="flex min-h-screen items-center justify-center text-white pt-14 lg:pt-0" style={{background:'#060c1a'}}>
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
    <main className="min-h-screen pt-[54px] text-white lg:pt-0 lg:pb-10" style={{background:'#060c1a'}}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

        {/* Back */}
        <Link href="/hp/students"
          className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-medium transition"
          style={{color:'rgba(255,255,255,0.3)'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Students
        </Link>

        {loadError && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/6 px-4 py-3 text-sm text-red-400">{loadError}</div>
        )}

        {/* ── HERO ── */}
        <div className="mb-5 relative overflow-hidden rounded-3xl"
          style={{background:'linear-gradient(135deg,rgba(16,185,129,0.08) 0%,rgba(255,255,255,0.015) 100%)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{background:'linear-gradient(90deg,transparent,rgba(16,185,129,0.6),rgba(56,189,248,0.3),transparent)'}}/>
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-[50px] pointer-events-none"
            style={{background:'rgba(16,185,129,0.1)'}}/>

          <div className="relative p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black"
                style={{background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid rgba(16,185,129,0.2)'}}>
                {student.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] mb-1" style={{color:'rgba(16,185,129,0.7)'}}>High Performance</p>
                <h1 className="text-2xl font-black text-white leading-tight">{student.full_name}</h1>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    {label:student.grade, color:'#38bdf8'},
                    student.class_group&&{label:`Class ${student.class_group}`, color:'rgba(255,255,255,0.5)'},
                    student.training_group&&{label:`Group ${student.training_group}`, color:student.training_group===1?'#a78bfa':student.training_group===2?'#38bdf8':student.training_group===3?'#fbbf24':'#10b981'},
                    attRate!==null&&{label:`${attRate}% attendance`, color:attRate>=80?'#10b981':attRate>=60?'#fbbf24':'#f87171'},
                  ].filter(Boolean).map((b:any)=>(
                    <span key={b.label} className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                      style={{background:`${b.color}12`,color:b.color,border:`1px solid ${b.color}25`}}>
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
              <a href={`/hp-print/student/${id}`} target="_blank"
                className="shrink-0 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition hover:text-white"
                style={{borderColor:'rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.4)'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                PDF
              </a>
            </div>

            {/* Tier summary */}
            {latest && Object.values(tierCounts).some(v=>v>0) && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-2" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                {Object.entries(tierCounts).map(([tier,count])=>{
                  if(!count) return null;
                  const t=TIERS.find(x=>x.label===tier)!;
                  return(
                    <div key={tier} className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border ${t.bg} ${t.border}`}>
                      <span className={`text-[15px] font-black ${t.color}`}>{count}</span>
                      <span className="text-[10px] font-semibold text-white/40">{tier}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── TEST RESULTS ── */}
        <div className="mb-4 overflow-hidden rounded-2xl" style={{background:'rgba(255,255,255,0.015)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.06)',background:'#0d1424'}}>
            <div>
              <p className="text-[15px] font-black text-white">Test Results</p>
              <p className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>{student.grade} battery · {yearResults.length} term{yearResults.length!==1?'s':''} recorded</p>
            </div>
            <div className="flex gap-1">
              {[2025,2026,2027].map(y=>(
                <button key={y} onClick={()=>setSelectedYear(y)}
                  className="rounded-xl px-3 py-1.5 text-[11px] font-bold transition"
                  style={{
                    background:selectedYear===y?'rgba(167,139,250,0.15)':'rgba(255,255,255,0.04)',
                    color:selectedYear===y?'#a78bfa':'rgba(255,255,255,0.3)',
                    border:`1px solid ${selectedYear===y?'rgba(167,139,250,0.3)':'rgba(255,255,255,0.06)'}`,
                  }}>
                  {y}
                </button>
              ))}
            </div>
          </div>

          {yearResults.length===0 ? (
            <div className="p-10 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm" style={{color:'rgba(255,255,255,0.3)'}}>No results for {selectedYear} yet.</p>
              <Link href={`/hp/testing`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition"
                style={{background:'rgba(167,139,250,0.1)',color:'#a78bfa',border:'1px solid rgba(167,139,250,0.2)'}}>
                Enter Tests →
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {tests.map(t=>{
                const termVals=TERMS.map(term=>{
                  const r=yearResults.find(r=>r.term===term);
                  const v=r?parseFloat(r[t.key]):NaN;
                  return isNaN(v)?null:v;
                });
                const latestVal=termVals.filter((v):v is number=>v!==null).pop();
                const tier=latestVal!==undefined?getTier(t.key,latestVal,t.lower):null;
                const tierStyle = tier ? {
                  background:`${['#10b981','#38bdf8','#a78bfa','#fbbf24','#94a3b8'][TIERS.findIndex(x=>x.label===tier.label)]}0a`,
                  border:`1px solid ${['#10b981','#38bdf8','#a78bfa','#fbbf24','#94a3b8'][TIERS.findIndex(x=>x.label===tier.label)]}20`,
                } : {background:'#0d1424',border:'1px solid rgba(255,255,255,0.06)'};

                return(
                  <div key={t.key} className="rounded-2xl p-4" style={tierStyle}>
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{color:'rgba(255,255,255,0.4)'}}>{t.label}</p>
                      {tier&&(
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-black"
                          style={{
                            background:`${['#10b981','#38bdf8','#a78bfa','#fbbf24','#94a3b8'][TIERS.findIndex(x=>x.label===tier.label)]}15`,
                            color:['#10b981','#38bdf8','#a78bfa','#fbbf24','#94a3b8'][TIERS.findIndex(x=>x.label===tier.label)],
                          }}>
                          {tier.label}
                        </span>
                      )}
                    </div>
                    {latestVal!==undefined&&(
                      <p className="text-2xl font-black text-white leading-none mb-1">
                        {fmt(t.key,latestVal)}<span className="text-[11px] ml-1" style={{color:'rgba(255,255,255,0.3)'}}>{t.unit}</span>
                      </p>
                    )}
                    <BenchBar k={t.key} val={latestVal??0} lower={t.lower}/>
                    <div className="mt-3 flex justify-between items-center">
                      <div className="flex gap-2">
                        {TERMS.map((term,i)=>{
                          const v=termVals[i];
                          return v!==null?(
                            <div key={term} className="text-center">
                              <p className="text-[9px]" style={{color:'rgba(255,255,255,0.3)'}}>{term.split(' ')[1]}</p>
                              <p className="text-[11px] font-bold text-white">{fmt(t.key,v)}</p>
                            </div>
                          ):null;
                        })}
                      </div>
                      <Sparkline vals={termVals} lower={t.lower}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PERFORMANCE RADAR ── */}
        {yearResults.length > 0 && (() => {
          const radarData = tests.map(t => {
            const r = yearResults.slice().reverse().find(r => r[t.key]);
            const val = r ? parseFloat(r[t.key]) : null;
            if (val === null) return null;
            const tier = getTier(t.key, val, t.lower);
            const tierIdx = tier ? TIERS.findIndex(x => x.label === tier.label) : 2;
            const score = Math.round(((4 - tierIdx) / 4) * 100);
            return { test: t.label.split(' ').slice(-1)[0].slice(0,8), score, full: t.label };
          }).filter(Boolean) as {test:string;score:number;full:string}[];

          if (radarData.length < 3) return null;
          return (
            <div className="mb-4 overflow-hidden rounded-2xl" style={{background:'rgba(255,255,255,0.015)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.06)',background:'#0d1424'}}>
                <p className="text-[15px] font-black text-white">Performance Radar</p>
                <p className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>Latest results across all tests · higher = better tier</p>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)" radialLines={false}/>
                    <PolarAngleAxis dataKey="test" tick={{fill:'rgba(255,255,255,0.45)',fontSize:9}} tickLine={false}/>
                    <Radar dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* ── TERM COMPARISON ── */}
        {yearResults.length > 1 && (() => {
          const barData = TERMS.map(term => {
            const r = yearResults.find(x => x.term === term);
            if (!r) return null;
            let score = 0, count = 0;
            tests.forEach(t => {
              const v = parseFloat(r[t.key]);
              if (isNaN(v)) return;
              const tier = getTier(t.key, v, t.lower);
              const idx = tier ? TIERS.findIndex(x => x.label === tier.label) : 2;
              score += (4 - idx) * 25;
              count++;
            });
            return count > 0 ? { term: term.replace('Term ','T'), score: Math.round(score / count) } : null;
          }).filter(Boolean) as {term:string;score:number}[];

          if (barData.length < 2) return null;
          return (
            <div className="mb-4 overflow-hidden rounded-2xl" style={{background:'rgba(255,255,255,0.015)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.06)',background:'#0d1424'}}>
                <p className="text-[15px] font-black text-white">Term Comparison</p>
                <p className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>Overall performance score by term</p>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={barData} margin={{top:5,right:5,bottom:0,left:-25}}>
                    <XAxis dataKey="term" tick={{fill:'rgba(255,255,255,0.4)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,100]} tick={{fill:'rgba(255,255,255,0.25)',fontSize:9}} axisLine={false} tickLine={false}/>
                    <Tooltip
                      contentStyle={{background:'rgba(10,15,30,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,fontSize:11}}
                      formatter={(v:any) => [`${v}/100`, 'Score']}
                      labelStyle={{color:'rgba(255,255,255,0.5)'}}
                    />
                    {barData.map((d,i) => (
                      <Bar key={d.term} dataKey="score" fill="#10b981" radius={[6,6,0,0]}>
                        <Cell fill={i===barData.length-1?'#10b981':'rgba(16,185,129,0.4)'}/>
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}
        <div className="mb-4 overflow-hidden rounded-2xl" style={{background:'rgba(255,255,255,0.015)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.06)',background:'#0d1424'}}>
            <div>
              <p className="text-[15px] font-black text-white">Attendance</p>
              <p className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>{attendance.length} sessions · {present} present</p>
            </div>
            <div className="flex gap-1 rounded-xl p-0.5" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
              {(['summary','history'] as const).map(tab=>(
                <button key={tab} onClick={()=>setAttTab(tab)}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold capitalize transition"
                  style={{
                    background:attTab===tab?'rgba(255,255,255,0.08)':'transparent',
                    color:attTab===tab?'white':'rgba(255,255,255,0.35)',
                  }}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {attTab==='summary'?(
            <div className="p-5">
              {attendance.length===0?(
                <p className="text-sm" style={{color:'rgba(255,255,255,0.3)'}}>No attendance recorded yet.</p>
              ):(
                <div className="flex items-center gap-6">
                  {/* Ring */}
                  <div className="relative h-20 w-20 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
                      <circle cx="18" cy="18" r="15.9" fill="none"
                        stroke={attRate!==null&&attRate>=80?'#10b981':attRate!==null&&attRate>=60?'#f59e0b':'#ef4444'}
                        strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${attRate||0} ${100-(attRate||0)}`}/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-lg font-black" style={{color:attRate!==null&&attRate>=80?'#10b981':attRate!==null&&attRate>=60?'#fbbf24':'#f87171'}}>{attRate}%</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      {label:'Present',val:attendance.filter(a=>a.status==='Present').length,color:'#6ee7b7'},
                      {label:'Late',   val:attendance.filter(a=>a.status==='Late').length,   color:'#fde68a'},
                      {label:'Absent', val:attendance.filter(a=>a.status==='Absent').length, color:'#fca5a5'},
                      {label:'Excused',val:attendance.filter(a=>a.status==='Excused').length,color:'#7dd3fc'},
                    ].filter(x=>x.val>0).map(x=>(
                      <div key={x.label} className="flex items-center gap-3">
                        <span className="text-sm font-black w-7 text-right" style={{color:x.color}}>{x.val}</span>
                        <span className="text-[11px]" style={{color:'rgba(255,255,255,0.35)'}}>{x.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ):(
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {attendance.length===0?(
                <p className="p-5 text-sm" style={{color:'rgba(255,255,255,0.3)'}}>No attendance recorded yet.</p>
              ):attendance.map(a=>{
                const sc = a.status==='Present'?{bg:'rgba(16,185,129,0.1)',color:'#6ee7b7'}
                  :a.status==='Late'?{bg:'rgba(251,191,36,0.1)',color:'#fde68a'}
                  :a.status==='Absent'?{bg:'rgba(248,113,113,0.1)',color:'#fca5a5'}
                  :{bg:'rgba(56,189,248,0.1)',color:'#7dd3fc'};
                return (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-2.5 border-b" style={{borderColor:'rgba(255,255,255,0.04)'}}>
                    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                      style={{background:sc.bg,color:sc.color}}>{a.status}</span>
                    <p className="flex-1 text-[12px]" style={{color:'rgba(255,255,255,0.4)'}}>{a.session_type}</p>
                    <p className="text-[10px]" style={{color:'rgba(255,255,255,0.2)'}}>{new Date(a.session_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── AI SUMMARY ── */}
        <div className="overflow-hidden rounded-2xl" style={{background:'rgba(167,139,250,0.04)',border:'1px solid rgba(167,139,250,0.15)'}}>
          <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-b" style={{borderColor:'rgba(167,139,250,0.1)'}}>
            <div>
              <p className="text-[14px] font-black text-white flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth={1.75} className="h-4 w-4"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/></svg>
                AI Performance Summary
              </p>
              <p className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>Generate a coach-ready report for any term</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-xl p-0.5" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                {(['Term 1','Term 2','Term 3','Full Year'] as const).map(t=>(
                  <button key={t} onClick={()=>setAiTerm(t)}
                    className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition"
                    style={{
                      background:aiTerm===t?'rgba(167,139,250,0.2)':'transparent',
                      color:aiTerm===t?'#a78bfa':'rgba(255,255,255,0.3)',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={generateAiSummary} disabled={aiLoading}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold transition disabled:opacity-50"
                style={{background:'rgba(167,139,250,0.12)',color:'#a78bfa',border:'1px solid rgba(167,139,250,0.25)'}}>
                {aiLoading?(
                  <><div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent"/>Generating…</>
                ):(
                  <>Generate {aiTerm}</>
                )}
              </button>
            </div>
          </div>
          <div className="px-5 py-4">
            {aiSummary?(
              <div>
                <p className="text-[13px] leading-relaxed" style={{color:'rgba(255,255,255,0.8)'}}>{aiSummary}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={()=>navigator.clipboard.writeText(aiSummary)}
                    className="rounded-xl border px-3 py-1.5 text-[10px] font-semibold transition hover:text-white"
                    style={{borderColor:'rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.35)'}}>
                    Copy
                  </button>
                  <button onClick={()=>setAiSummary(null)}
                    className="rounded-xl border px-3 py-1.5 text-[10px] font-semibold transition hover:text-white"
                    style={{borderColor:'rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.35)'}}>
                    Clear
                  </button>
                </div>
              </div>
            ):(
              <p className="text-[12px] leading-relaxed" style={{color:'rgba(255,255,255,0.3)'}}>
                Select a term above and hit Generate — the AI will produce a personalised report covering test results, attendance, improvements and development focus.
              </p>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}