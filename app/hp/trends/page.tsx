'use client';
import * as React from 'react';
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
  { key: 'run_500m',          label: '500m Run',          unit: 'mm:ss',higher: false, grade: 'both' },
];

const BENCH: Record<string, [number,number,number,number]> = {
  chin_up_hang:      [45,25,12,5],
  broad_jump:        [185,165,148,130],
  pushup_2min:       [22,18,14,10],
  triple_broad_jump: [680,600,530,460],
  sprint_10m:        [1.85,1.97,2.10,2.25],
  sprint_30m:        [4.25,4.52,4.80,5.10],
  run_500m:          [100,115,130,150],
};

const TIERS = [
  { label:'Elite',     color:'#10b981', bg:'rgba(16,185,129,0.15)',  border:'rgba(16,185,129,0.3)'  },
  { label:'Good',      color:'#38bdf8', bg:'rgba(56,189,248,0.15)',  border:'rgba(56,189,248,0.3)'  },
  { label:'Average',   color:'#fbbf24', bg:'rgba(251,191,36,0.15)',  border:'rgba(251,191,36,0.3)'  },
  { label:'Developing',color:'#fb923c', bg:'rgba(251,146,60,0.15)',  border:'rgba(251,146,60,0.3)'  },
  { label:'Poor',      color:'#f87171', bg:'rgba(248,113,113,0.15)', border:'rgba(248,113,113,0.3)' },
];

function getTier(key:string, val:number, higher:boolean) {
  const b = BENCH[key]; if(!b) return TIERS[2];
  const [e,g,a,d] = b;
  if(higher) { if(val>=e) return TIERS[0]; if(val>=g) return TIERS[1]; if(val>=a) return TIERS[2]; if(val>=d) return TIERS[3]; return TIERS[4]; }
  else        { if(val<=e) return TIERS[0]; if(val<=g) return TIERS[1]; if(val<=a) return TIERS[2]; if(val<=d) return TIERS[3]; return TIERS[4]; }
}

function fmt(key:string, val:number):string {
  if(key==='run_500m'){ const m=Math.floor(val/60),s=Math.round(val%60); return `${m}:${s.toString().padStart(2,'0')}`; }
  if(key==='chin_up_hang'){ if(val>=60){const m=Math.floor(val/60),s=val%60;return s?`${m}m${s}s`:`${m}min`;} return `${Math.round(val)}s`; }
  return val%1===0?String(val):val.toFixed(2);
}

// ─── Tier donut ──────────────────────────────────────────────────────────────
function TierDonut({ counts, total }: { counts: Record<string,number>; total: number }) {
  const R = 38, C = 44, stroke = 10;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const segments = TIERS.map(t => {
    const n = counts[t.label] || 0;
    const pct = total > 0 ? n / total : 0;
    const dash = pct * circ;
    const seg = { color: t.color, dash, offset, n, label: t.label };
    offset += dash;
    return seg;
  }).filter(s => s.n > 0);
  const noData = total - Object.values(counts).reduce((a,b)=>a+b,0);
  const elites = counts['Elite'] || 0;
  return (
    <svg viewBox={`0 0 ${C*2} ${C*2}`} className="w-full max-w-[88px]">
      <circle cx={C} cy={C} r={R} fill="none" stroke="#1e293b" strokeWidth={stroke}/>
      {segments.map((s,i) => (
        <circle key={i} cx={C} cy={C} r={R} fill="none"
          stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circ-s.dash}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="butt"
          style={{ transform:`rotate(-90deg)`, transformOrigin:`${C}px ${C}px` }}/>
      ))}
      <text x={C} y={C-4} textAnchor="middle" fontSize="13" fontWeight="900" fill="white">{elites}</text>
      <text x={C} y={C+10} textAnchor="middle" fontSize="7" fill="#64748b" fontWeight="700">ELITE</text>
    </svg>
  );
}

// ─── Horizontal bar chart for one test ───────────────────────────────────────
function TestBarChart({ students, latestMap, testKey, higher, unit }: {
  students: Row[]; latestMap: Record<string,Row>; testKey: string; higher: boolean; unit: string;
}) {
  const vals = students.map(s => {
    const r = latestMap[s.id];
    const v = r ? parseFloat(r[testKey]) : NaN;
    return { name: s.full_name.trim().split(' ').pop() || s.full_name, val: isNaN(v) ? null : v };
  }).filter(x => x.val !== null) as { name:string; val:number }[];

  if (!vals.length) return (
    <div className="flex h-32 items-center justify-center text-slate-700 text-sm">No data yet</div>
  );

  const sorted = [...vals].sort((a,b) => higher ? b.val-a.val : a.val-b.val);
  const max = Math.max(...sorted.map(x => x.val));
  const min = Math.min(...sorted.map(x => x.val));

  return (
    <div className="space-y-1.5">
      {sorted.map((x, i) => {
        const tier = getTier(testKey, x.val, higher);
        const pct = max === min ? 100 : ((x.val - min) / (max - min)) * 100;
        const barPct = higher ? pct : 100 - pct + 10;
        return (
          <div key={i} className="flex items-center gap-2">
            <p className="w-20 shrink-0 truncate text-[10px] text-slate-400 text-right">{x.name}</p>
            <div className="flex-1 h-5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full flex items-center px-2 transition-all"
                style={{ width: `${Math.max(barPct, 8)}%`, background: tier.color, opacity: 0.85 }}>
                <span className="text-[9px] font-black text-black/70 whitespace-nowrap">{fmt(testKey, x.val)}</span>
              </div>
            </div>
            <span className="w-8 shrink-0 text-[9px] font-black text-right" style={{ color: tier.color }}>{tier.label.slice(0,3)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Class term trend lines ───────────────────────────────────────────────────
function TermTrendChart({ students, results, testKey, higher, selYear }: {
  students: Row[]; results: Row[]; testKey: string; higher: boolean; selYear: number;
}) {
  const termAvgs = TERMS.map(term => {
    const vals = students.map(s => {
      const r = results.find(r => r.student_id===s.id && r.term===term && r.year===selYear);
      const v = r ? parseFloat(r[testKey]) : NaN;
      return isNaN(v) ? null : v;
    }).filter((v): v is number => v!==null);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  });

  const valid = termAvgs.filter((v): v is number => v!==null);
  if (valid.length === 0) return <div className="flex h-16 items-center justify-center text-slate-700 text-xs">No data</div>;

  const mn = Math.min(...valid), mx = Math.max(...valid), rng = mx-mn || 1;
  const W = 180, H = 48;
  const pts = termAvgs.map((v,i) => v!==null ? `${(i/(TERMS.length-1))*W},${H-4-((v-mn)/rng)*(H-8)}` : null).filter(Boolean).join(' ');
  const improved = valid.length > 1 && (higher ? valid[valid.length-1]>valid[0] : valid[valid.length-1]<valid[0]);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g-${testKey}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={improved?'#10b981':'#f87171'} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={improved?'#10b981':'#f87171'} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {pts && <polyline points={pts} fill="none" stroke={improved?'#10b981':'#f87171'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {termAvgs.map((v,i) => v!==null ? (
          <circle key={i} cx={(i/(TERMS.length-1))*W} cy={H-4-((v-mn)/rng)*(H-8)} r="3.5"
            fill={improved?'#10b981':'#f87171'} stroke="#030810" strokeWidth="1.5"/>
        ) : null)}
      </svg>
      <div className="flex justify-between mt-1">
        {TERMS.map((term,i) => (
          <div key={term} className="text-center">
            <p className="text-[8px] text-slate-700">{term.replace('Term ','T')}</p>
            {termAvgs[i]!==null && <p className="text-[9px] font-black text-slate-400">{fmt(testKey, termAvgs[i]!)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HPTrendsPage() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [results, setResults]   = React.useState<Row[]>([]);
  const [loading, setLoading]   = React.useState(true);
  const [grade, setGrade]       = React.useState<'Grade 8'|'Grade 9'>('Grade 8');
  const [selYear, setSelYear]   = React.useState(2026);
  const [selClass, setSelClass] = React.useState<string|null>(null);
  const [selTest, setSelTest]   = React.useState<string|null>(null);

  React.useEffect(() => {
    Promise.all([
      supabase.from('hp_students').select('*').eq('is_active',true),
      supabase.from('hp_test_results').select('*').order('year').order('term'),
    ]).then(([s,r]) => {
      const sorted = (s.data||[]).sort((a:Row,b:Row) => {
        const sA=a.full_name.trim().split(' ').pop()?.toLowerCase()||'';
        const sB=b.full_name.trim().split(' ').pop()?.toLowerCase()||'';
        return sA.localeCompare(sB);
      });
      setStudents(sorted); setResults(r.data||[]); setLoading(false);
    });
  }, []);

  const tests = TESTS.filter(t => t.grade===grade.split(' ')[1] || t.grade==='both');

  const latestMap = React.useMemo(() => {
    const map: Record<string,Row> = {};
    results.filter(r => r.year===selYear).forEach(r => { map[r.student_id] = r; });
    return map;
  }, [results, selYear]);

  const classData = React.useMemo(() => {
    return HP_CLASSES.map(c => {
      const cs = students.filter(s => s.grade===grade && s.class_group===c);
      const tested = cs.filter(s => latestMap[s.id]).length;
      // Tier breakdown across all tests
      const counts: Record<string,number> = {};
      cs.forEach(s => {
        const r = latestMap[s.id]; if(!r) return;
        tests.forEach(t => {
          const v = parseFloat(r[t.key]); if(isNaN(v)) return;
          const tier = getTier(t.key,v,t.higher).label;
          counts[tier] = (counts[tier]||0)+1;
        });
      });
      const totalCounts = Object.values(counts).reduce((a,b)=>a+b,0);
      // Class avg composite score (normalised)
      const score = cs.length>0 ? cs.reduce((acc,s) => {
        const r = latestMap[s.id]; if(!r) return acc;
        let tot=0,cnt=0;
        tests.forEach(t => { const v=parseFloat(r[t.key]); if(!isNaN(v)){ tot+=getTierScore(t.key,v,t.higher); cnt++; }});
        return acc + (cnt>0?tot/cnt:0);
      }, 0) / Math.max(cs.length,1) : 0;
      return { cls:c, students:cs, tested, counts, totalCounts, score };
    }).filter(x => x.students.length>0);
  }, [students, grade, latestMap, tests]);

  function getTierScore(key:string, val:number, higher:boolean): number {
    const t = getTier(key,val,higher);
    const idx = TIERS.findIndex(x => x.label===t.label);
    return (4-idx)*25; // 100,75,50,25,0
  }

  const selectedClassData = selClass ? classData.find(c => c.cls===selClass) : null;
  const selectedClassStudents = selectedClassData?.students || [];

  if(loading) return (
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-900 animate-pulse"/>)}
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
            <h1 className="mt-1 text-3xl font-black text-white">Trends</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-0.5">
              {[2025,2026,2027].map(y => (
                <button key={y} onClick={() => { setSelYear(y); setSelClass(null); setSelTest(null); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${selYear===y?'bg-slate-700 text-white':'text-slate-500 hover:text-white'}`}>{y}</button>
              ))}
            </div>
            <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-0.5">
              {(['Grade 8','Grade 9'] as const).map(g => (
                <button key={g} onClick={() => { setGrade(g); setSelClass(null); setSelTest(null); }}
                  className={`rounded-lg px-4 py-1.5 text-xs font-black transition ${grade===g ? g==='Grade 8'?'bg-sky-500/25 text-sky-300':'bg-violet-500/25 text-violet-300' : 'text-slate-500 hover:text-white'}`}>{g}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── GRADE OVERVIEW ── */}
        {!selClass && (() => {
          const gradeStudents = students.filter(s => s.grade===grade);
          const gradeTested = gradeStudents.filter(s => latestMap[s.id]).length;
          const gradePct = gradeStudents.length>0 ? Math.round(gradeTested/gradeStudents.length*100) : 0;
          return (
            <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              {/* Grade header strip */}
              <div className={`px-5 py-4 border-b border-slate-800 flex items-center justify-between ${grade==='Grade 8'?'bg-sky-500/5':'bg-violet-500/5'}`}>
                <div>
                  <p className={`text-lg font-black ${grade==='Grade 8'?'text-sky-400':'text-violet-400'}`}>{grade} Overview</p>
                  <p className="text-xs text-slate-500">{gradeStudents.length} athletes · {gradeTested} tested · {selYear}</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${gradePct===100?'text-emerald-400':gradePct>50?'text-amber-400':'text-red-400'}`}>{gradePct}%</p>
                  <p className="text-[10px] text-slate-600">tested this year</p>
                </div>
              </div>

              {/* Per-test grade stats */}
              <div className="divide-y divide-slate-800/50">
                {tests.map(t => {
                  const vals = gradeStudents.map(s => {
                    const r=latestMap[s.id]; const v=r?parseFloat(r[t.key]):NaN; return isNaN(v)?null:v;
                  }).filter((v): v is number => v!==null);
                  if (!vals.length) return null;
                  const avgVal = vals.reduce((a,b)=>a+b,0)/vals.length;
                  const avgTier = getTier(t.key,avgVal,t.higher);
                  const best = t.higher ? Math.max(...vals) : Math.min(...vals);
                  const counts: Record<string,number> = {};
                  vals.forEach(v => { const tier=getTier(t.key,v,t.higher).label; counts[tier]=(counts[tier]||0)+1; });

                  // Term trend
                  const termAvgs = TERMS.map(term => {
                    const tv = gradeStudents.map(s => {
                      const r=results.find(r=>r.student_id===s.id&&r.term===term&&r.year===selYear);
                      const v=r?parseFloat(r[t.key]):NaN; return isNaN(v)?null:v;
                    }).filter((v): v is number => v!==null);
                    return tv.length ? tv.reduce((a,b)=>a+b,0)/tv.length : null;
                  });
                  const validTerms = termAvgs.filter((v): v is number => v!==null);
                  const improved = validTerms.length>1 && (t.higher ? validTerms[validTerms.length-1]>validTerms[0] : validTerms[validTerms.length-1]<validTerms[0]);

                  return (
                    <div key={t.key} className="px-5 py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                      {/* Test label + avg */}
                      <div className="w-full sm:w-36 shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">{t.label}</p>
                        <p className="text-xl font-black mt-0.5" style={{ color:avgTier.color }}>
                          {fmt(t.key,avgVal)}
                          {t.unit && t.unit!=='mm:ss' && <span className="text-xs ml-1 opacity-40">{t.unit}</span>}
                        </p>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-black"
                          style={{ background:avgTier.bg, color:avgTier.color, border:`1px solid ${avgTier.border}` }}>
                          {avgTier.label} avg
                        </span>
                      </div>

                      {/* Tier bar */}
                      <div className="flex-1 min-w-[120px]">
                        <div className="flex h-5 w-full overflow-hidden rounded-lg gap-px mb-1.5">
                          {TIERS.map(tier => {
                            const n=counts[tier.label]||0;
                            return n>0 ? (
                              <div key={tier.label} className="h-full flex items-center justify-center text-[9px] font-black"
                                style={{ flex:n, background:tier.color, color:'rgba(0,0,0,0.7)' }}>{n}</div>
                            ) : null;
                          })}
                          {(gradeStudents.length-vals.length)>0 && <div className="h-full bg-slate-800" style={{ flex:gradeStudents.length-vals.length }}/>}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {TIERS.map(tier => { const n=counts[tier.label]||0; return n>0?<span key={tier.label} className="text-[9px] font-black" style={{color:tier.color}}>{tier.label} {n}</span>:null; })}
                        </div>
                      </div>

                      {/* Term sparkline */}
                      <div className="w-32 shrink-0">
                        {validTerms.length > 1 ? (
                          <>
                            <div className="flex justify-between mb-1">
                              {termAvgs.map((v,i) => (
                                <div key={i} className="text-center">
                                  <p className="text-[8px] text-slate-700">{TERMS[i].replace('Term ','T')}</p>
                                  <p className="text-[9px] font-black" style={{color: v!==null?(improved?'#10b981':'#f87171'):'#334155'}}>
                                    {v!==null?fmt(t.key,v):'—'}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`h-1.5 flex-1 rounded-full ${improved?'bg-emerald-500/30':'bg-red-500/30'}`}>
                                <div className={`h-full rounded-full ${improved?'bg-emerald-500':'bg-red-500'}`}
                                  style={{ width: validTerms.length>1?`${Math.abs(((validTerms[validTerms.length-1]-validTerms[0])/validTerms[0])*100)*3}%`:'0%', maxWidth:'100%' }}/>
                              </div>
                              <span className={`text-[9px] font-black ${improved?'text-emerald-400':'text-red-400'}`}>
                                {improved?'▲':'▼'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="text-[10px] text-slate-700">1 term only</p>
                        )}
                      </div>

                      {/* Best */}
                      <div className="shrink-0 text-right hidden sm:block">
                        <p className="text-[10px] text-slate-600">Best</p>
                        <p className="text-sm font-black text-white">{fmt(t.key,best)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── CLASS TILES ── */}
        {!selClass && (
          <>
            <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-600">Select a class to explore</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classData.map(({ cls, students: cs, tested, counts, totalCounts, score }) => {
                const isGrade8 = grade==='Grade 8';
                const pct = cs.length>0 ? Math.round(tested/cs.length*100) : 0;
                return (
                  <button key={cls} onClick={() => { setSelClass(cls); setSelTest(null); }}
                    className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-slate-600 hover:bg-slate-800/60 hover:scale-[1.02]">
                    {/* Class name + score */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className={`text-4xl font-black ${isGrade8?'text-sky-400':'text-violet-400'}`}>
                          {grade==='Grade 8'?'8':'9'}{cls}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{cs.length} athletes · {tested} tested</p>
                      </div>
                      <TierDonut counts={counts} total={totalCounts}/>
                    </div>

                    {/* Testing progress */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-slate-600">Testing completion</span>
                        <span className={`text-[10px] font-black ${pct===100?'text-emerald-400':pct>50?'text-amber-400':'text-slate-500'}`}>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800">
                        <div className={`h-full rounded-full transition-all ${pct===100?'bg-emerald-500':'bg-sky-500'}`} style={{ width:`${pct}%` }}/>
                      </div>
                    </div>

                    {/* Tier legend */}
                    <div className="flex gap-1.5 flex-wrap">
                      {TIERS.map(t => {
                        const n = counts[t.label]||0;
                        return n>0 ? (
                          <span key={t.label} className="rounded-full px-2 py-0.5 text-[9px] font-black"
                            style={{ background:t.bg, color:t.color, border:`1px solid ${t.border}` }}>
                            {n} {t.label}
                          </span>
                        ) : null;
                      })}
                    </div>

                    <p className="mt-3 text-[10px] text-slate-700 group-hover:text-slate-500 transition">Tap to explore →</p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── CLASS DETAIL ── */}
        {selClass && selectedClassData && (() => {
          const { students: cs } = selectedClassData;
          const activeTests = selTest ? tests.filter(t => t.key===selTest) : tests;
          const isGrade8 = grade==='Grade 8';

          return (
            <div>
              {/* Back + class header */}
              <div className="mb-6 flex items-center gap-4">
                <button onClick={() => { setSelClass(null); setSelTest(null); }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-black text-slate-400 hover:text-white transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  All Classes
                </button>
                <div>
                  <h2 className={`text-2xl font-black ${isGrade8?'text-sky-400':'text-violet-400'}`}>
                    {grade==='Grade 8'?'8':'9'}{selClass}
                  </h2>
                  <p className="text-xs text-slate-500">{cs.length} athletes · {selectedClassData.tested} tested in {selYear}</p>
                </div>
              </div>

              {/* Test filter pills */}
              <div className="mb-6 flex flex-wrap gap-2">
                <button onClick={() => setSelTest(null)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${!selTest?'border-slate-500 bg-slate-700 text-white':'border-slate-800 bg-slate-900 text-slate-500 hover:text-white'}`}>
                  All Tests
                </button>
                {tests.map(t => (
                  <button key={t.key} onClick={() => setSelTest(selTest===t.key?null:t.key)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${selTest===t.key?'border-sky-500/40 bg-sky-500/15 text-sky-300':'border-slate-800 bg-slate-900 text-slate-500 hover:text-white'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Test cards */}
              <div className={`grid gap-5 ${selTest?'grid-cols-1':'sm:grid-cols-2'}`}>
                {activeTests.map(t => {
                  // stats
                  const vals = cs.map(s => { const r=latestMap[s.id]; const v=r?parseFloat(r[t.key]):NaN; return isNaN(v)?null:v; }).filter((v): v is number => v!==null);
                  const avgVal = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
                  const avgTier = avgVal!==null ? getTier(t.key,avgVal,t.higher) : null;
                  const best = vals.length ? (t.higher ? Math.max(...vals) : Math.min(...vals)) : null;
                  const counts: Record<string,number> = {};
                  vals.forEach(v => { const tier=getTier(t.key,v,t.higher).label; counts[tier]=(counts[tier]||0)+1; });

                  return (
                    <div key={t.key} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                      {/* Card header */}
                      <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between"
                        style={avgTier ? { borderColor: avgTier.border, background: avgTier.bg } : {}}>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{t.label}</p>
                          {avgVal!==null && (
                            <p className="mt-0.5 text-2xl font-black" style={{ color: avgTier?.color||'white' }}>
                              {fmt(t.key,avgVal)}
                              <span className="ml-1.5 text-sm opacity-50">{t.unit==='mm:ss'?'':t.unit} avg</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {avgTier && <span className="rounded-xl px-2.5 py-1 text-xs font-black" style={{ background:avgTier.bg, color:avgTier.color, border:`1px solid ${avgTier.border}` }}>{avgTier.label}</span>}
                          <p className="mt-1 text-[10px] text-slate-600">{vals.length}/{cs.length} tested</p>
                        </div>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Tier distribution */}
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-600">Tier Breakdown</p>
                          <div className="flex h-6 w-full overflow-hidden rounded-xl gap-0.5">
                            {TIERS.map(tier => {
                              const n = counts[tier.label]||0;
                              return n>0 ? (
                                <div key={tier.label} className="h-full flex items-center justify-center text-[9px] font-black"
                                  style={{ flex:n, background:tier.color, color:'rgba(0,0,0,0.7)' }}>
                                  {n}
                                </div>
                              ) : null;
                            })}
                            {(cs.length-vals.length)>0 && (
                              <div className="h-full bg-slate-800" style={{ flex:cs.length-vals.length }}/>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                            {TIERS.map(tier => {
                              const n = counts[tier.label]||0;
                              return n>0 ? (
                                <span key={tier.label} className="text-[10px] font-black" style={{ color:tier.color }}>
                                  {tier.label} · {n}
                                </span>
                              ) : null;
                            })}
                            {(cs.length-vals.length)>0 && <span className="text-[10px] text-slate-700">No data · {cs.length-vals.length}</span>}
                          </div>
                        </div>

                        {/* Term trend */}
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-600">Class Average by Term</p>
                          <TermTrendChart students={cs} results={results} testKey={t.key} higher={t.higher} selYear={selYear}/>
                        </div>

                        {/* Athlete bar chart */}
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-600">Athlete Rankings</p>
                          <TestBarChart students={cs} latestMap={latestMap} testKey={t.key} higher={t.higher} unit={t.unit}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </main>
  );
}