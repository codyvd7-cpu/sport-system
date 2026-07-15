'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid, ReferenceLine,
} from 'recharts';
import { HP_TERMS } from '@/lib/hpTerm';
import { GRADE8_TESTS, GRADE9_TESTS, BENCHMARKS as BENCH, TIERS, getTier, fmtValue } from '@/lib/hpTests';
import { HP_CLASSES } from '@/lib/hpConfig';
import {
  movementSummary, topMovers, watchList,
  swc as calcSwc, sd as calcSd, median as calcMedian,
  percentileRank, termSeries, classifyChange,
} from '@/lib/hpAnalytics';

type Row = Record<string, any>;
const TERMS = HP_TERMS;

// Tests come from shared hpTests — no local copy




// fmt → use fmtValue from hpTests

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Spark({vals,higher}:{vals:(number|null)[];higher:boolean}){
  const v=vals.filter((x):x is number=>x!==null);
  if(v.length<1)return null;
  const W=48,H=20;
  // Single data point — just a dot
  if(v.length===1) return(
    <svg viewBox={`0 0 ${W} ${H}`} className="h-5 w-12">
      <circle cx={W/2} cy={H/2} r="2.5" fill="rgba(255,255,255,0.3)"/>
    </svg>
  );
  const mn=Math.min(...v),mx=Math.max(...v),rng=mx-mn||1;
  const improved=higher?v[v.length-1]>v[0]:v[v.length-1]<v[0];
  const col=improved?'#10b981':'#f87171';
  const pts=vals.map((x,i)=>x!==null?`${(i/(vals.length-1))*W},${H-3-((x-mn)/rng)*(H-6)}`:null).filter(Boolean).join(' ');
  return(
    <svg viewBox={`0 0 ${W} ${H}`} className="h-5 w-12">
      <polyline points={pts} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {v.length>0&&<circle cx={(vals.lastIndexOf(v[v.length-1])/(vals.length-1))*W} cy={H-3-((v[v.length-1]-mn)/rng)*(H-6)} r="2.5" fill={col}/>}
    </svg>
  );
}

// ─── Tier pill ────────────────────────────────────────────────────────────────
function TierPill({label}:{label:string}){
  const t=TIERS.find(x=>x.label===label)||TIERS[2];
  return(
    <span className="rounded-full px-2 py-0.5 text-[9px] font-black whitespace-nowrap"
      style={{background:t.bg,color:t.color,border:`1px solid ${t.border}`}}>
      {t.label}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HPTrendsPage(){
  const[students,setStudents]=React.useState<Row[]>([]);
  const[results,setResults]=React.useState<Row[]>([]);
  const[loading,setLoading]=React.useState(true);
  const[grade,setGrade]=React.useState<'Grade 8'|'Grade 9'>('Grade 8');
  const[selYear,setSelYear]=React.useState(()=>new Date().getFullYear());
  const[selClass,setSelClass]=React.useState<string|null>(null);
  const[selTest,setSelTest]=React.useState<string|null>(null);

  React.useEffect(()=>{
    fetch('/api/hp/data?type=trends', { credentials:'include' })
      .then(r=>r.json())
      .then(d=>{
        const sorted=(d.students||[]).sort((a:Row,b:Row)=>{
          const sA=a.full_name.trim().split(' ').pop()?.toLowerCase()||'';
          const sB=b.full_name.trim().split(' ').pop()?.toLowerCase()||'';
          return sA.localeCompare(sB);
        });
        setStudents(sorted);setResults(d.tests||[]);setLoading(false);
      })
      .catch(()=>setLoading(false));
  },[]);

  const tests = grade==='Grade 8' ? GRADE8_TESTS : GRADE9_TESTS;
  const gradeStudents=students.filter(s=>s.grade===grade);

  // latest result per student for selected year
  const latestMap=React.useMemo(()=>{
    const TERM_ORD: Record<string,number> = {'Term 1':1,'Term 2':2,'Term 3':3,'Term 4':4};
    // Sort so the latest term/date wins — pick last for each student
    const sorted=[...results]
      .filter(r=>r.year===selYear)
      .sort((a,b)=>{
        if(a.year!==b.year) return a.year-b.year;
        const ta=TERM_ORD[a.term]??0, tb=TERM_ORD[b.term]??0;
        if(ta!==tb) return ta-tb;
        return (a.test_date||'').localeCompare(b.test_date||'');
      });
    const map:Record<string,Row>={};
    sorted.forEach(r=>{map[r.student_id]=r;});
    return map;
  },[results,selYear]);

  // ── Cohort insights (SWC-based movement, top movers, watch list) ──────────────
  const insights = React.useMemo(() => {
    if (!gradeStudents.length) return null;
    const move = movementSummary(gradeStudents, results, tests, selYear);
    if (move.comparisons === 0) return null; // needs 2+ terms of data
    return {
      move,
      movers: topMovers(gradeStudents, results, tests, selYear, 3),
      watch:  watchList(gradeStudents, results, tests, selYear, 6),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, results, grade, selYear]);

  // term averages for a set of students + test key
  function termAvgs(ss:Row[],key:string){
    return TERMS.map(term=>{
      const vals=ss.map(s=>{
        const r=results.find(r=>r.student_id===s.id&&r.term===term&&r.year===selYear);
        const v=r?parseFloat(r[key]):NaN;return isNaN(v)?null:v;
      }).filter((v):v is number=>v!==null);
      return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    });
  }

  // students in selected class
  const classStudents=React.useMemo(()=>{
    if(!selClass)return[];
    return gradeStudents.filter(s=>s.class_group===selClass);
  },[selClass,gradeStudents]);

  // selected test object
  const testObj=tests.find(t=>t.key===selTest);

  if(loading) return (
    <div style={{minHeight:'100vh',background:'#060c1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:24,height:24,borderRadius:'50%',border:'3px solid #10b981',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isG8=grade==='Grade 8';
  const gradeColor=isG8?'text-sky-400':'text-violet-400';
  const gradeBg=isG8?'bg-sky-500/20 text-sky-300 border-sky-500/40':'bg-violet-500/20 text-violet-300 border-violet-500/40';

  return(
    <main className="min-h-screen pt-[54px] text-white lg:pt-0" style={{background:'#060c1a'}}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

        {/* ── HEADER ── */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{color:'rgba(16,185,129,0.7)'}}>High Performance</p>
            <h1 className="text-4xl font-black tracking-tight leading-none text-white">Trends</h1>
          </div>
        </div>

        {/* ── CONTROL BAR ── */}
        <div className="mb-5 flex flex-wrap gap-2">
          {/* Year navigator */}
          <div className="flex items-center gap-1 rounded-xl border p-1"
            style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)'}}>
            <button onClick={()=>{setSelYear(y=>y-1);setSelClass(null);setSelTest(null);}}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition"
              style={{color:'rgba(255,255,255,0.4)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="px-2 text-sm font-black text-white">{selYear}</span>
            <button onClick={()=>{setSelYear(y=>Math.min(y+1,new Date().getFullYear()));setSelClass(null);setSelTest(null);}}
              disabled={selYear>=new Date().getFullYear()}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition disabled:opacity-30"
              style={{color:'rgba(255,255,255,0.4)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          {/* Grade */}
          <div className="flex rounded-xl border p-0.5"
            style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)'}}>
            {(['Grade 8','Grade 9'] as const).map(g=>(
              <button key={g} onClick={()=>{setGrade(g);setSelClass(null);setSelTest(null);}}
                className="rounded-lg px-4 py-1.5 text-[11px] font-bold transition"
                style={{
                  background: grade===g ? (isG8?'rgba(56,189,248,0.15)':'rgba(167,139,250,0.15)') : 'transparent',
                  color: grade===g ? (isG8?'#38bdf8':'#a78bfa') : 'rgba(255,255,255,0.4)',
                }}>{g}</button>
            ))}
          </div>
          {/* Class pills */}
          {HP_CLASSES.map(c=>{
            const cs=gradeStudents.filter(s=>s.class_group===c);
            if(!cs.length)return null;
            const tested=cs.filter(s=>latestMap[s.id]).length;
            const pct=Math.round(tested/cs.length*100);
            const active=selClass===c;
            return(
              <button key={c} onClick={()=>{setSelClass(active?null:c);setSelTest(null);}}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition ${active?`${gradeBg} border`:'border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                <span>{isG8?'8':'9'}{c}</span>
                <span className={`text-[9px] ${active?'opacity-80':'text-slate-600'}`}>{pct}%</span>
              </button>
            );
          })}
        </div>

        {/* ── BREADCRUMB ── */}
        {selClass&&(
          <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">
            <button onClick={()=>{setSelClass(null);setSelTest(null);}} className="hover:text-white transition">{grade}</button>
            <span>/</span>
            <span className={gradeColor}>{isG8?'8':'9'}{selClass}</span>
            {selTest&&testObj&&<><span>/</span><span className="text-white">{testObj.label}</span></>}
          </div>
        )}

        {/* ════════════════════════════════════════
            VIEW A — No class selected: grade overview
        ════════════════════════════════════════ */}
        {!selClass&&(
          <div className="space-y-4">
            {/* Stat strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'Athletes', val:gradeStudents.length,                                   color:'white'},
                {label:'Tested',   val:gradeStudents.filter(s=>latestMap[s.id]).length,        color:'#10b981'},
                {label:'Untested', val:gradeStudents.filter(s=>!latestMap[s.id]).length,       color:'#fbbf24'},
              ].map(x=>(
                <div key={x.label} className="rounded-2xl border p-4 text-center"
                  style={{background:'#0d1424',borderColor:'rgba(255,255,255,0.06)'}}>
                  <p className="text-2xl font-black" style={{color:x.color}}>{x.val}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1" style={{color:'rgba(255,255,255,0.25)'}}>{x.label}</p>
                </div>
              ))}
            </div>

            {/* ── Cohort Insights — SWC-classified movement ── */}
            {insights&&(
              <div className="rounded-2xl overflow-hidden"
                style={{background:'rgba(255,255,255,0.015)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <div className="border-b px-5 py-3 flex flex-wrap items-center justify-between gap-2"
                  style={{borderColor:'rgba(255,255,255,0.06)',background:'#0d1424'}}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:'#10b981'}}>Cohort Insights · since previous test</p>
                  <p className="text-[9px]" style={{color:'rgba(255,255,255,0.25)'}}>Changes measured against SWC (0.2 × cohort SD) — smaller shifts are normal variation</p>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {/* Movement summary */}
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full px-3 py-1.5 text-[11px] font-black"
                      style={{background:'rgba(16,185,129,0.12)',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)'}}>
                      ▲ {insights.move.improved} meaningful improvement{insights.move.improved===1?'':'s'}
                    </span>
                    <span className="rounded-full px-3 py-1.5 text-[11px] font-bold"
                      style={{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.45)',border:'1px solid rgba(255,255,255,0.1)'}}>
                      ≈ {insights.move.stable} within normal variation
                    </span>
                    <span className="rounded-full px-3 py-1.5 text-[11px] font-black"
                      style={{background:'rgba(248,113,113,0.1)',color:'#f87171',border:'1px solid rgba(248,113,113,0.3)'}}>
                      ▼ {insights.move.declined} meaningful decline{insights.move.declined===1?'':'s'}
                    </span>
                  </div>

                  {/* Top movers */}
                  {(insights.movers.up.length>0||insights.movers.down.length>0)&&(
                    <div>
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em]" style={{color:'rgba(255,255,255,0.3)'}}>Biggest movers</p>
                      <div className="flex flex-wrap gap-2">
                        {insights.movers.up.map(m=>(
                          <Link key={m.id} href={`/hp/students/${m.id}`}
                            className="rounded-xl border px-3 py-1.5 text-[11.5px] font-bold transition hover:brightness-125"
                            style={{background:'rgba(16,185,129,0.08)',color:'#34d399',borderColor:'rgba(16,185,129,0.25)',textDecoration:'none'}}>
                            {m.name} ↑
                          </Link>
                        ))}
                        {insights.movers.down.map(m=>(
                          <Link key={m.id} href={`/hp/students/${m.id}`}
                            className="rounded-xl border px-3 py-1.5 text-[11.5px] font-bold transition hover:brightness-125"
                            style={{background:'rgba(248,113,113,0.07)',color:'#f87171',borderColor:'rgba(248,113,113,0.22)',textDecoration:'none'}}>
                            {m.name} ↓
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Watch list */}
                  {insights.watch.length>0&&(
                    <div>
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em]" style={{color:'rgba(255,255,255,0.3)'}}>Watch list — needs coach attention</p>
                      <div className="space-y-1.5">
                        {insights.watch.map(w=>(
                          <Link key={w.id} href={`/hp/students/${w.id}`}
                            className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 transition hover:bg-white/[0.03]"
                            style={{borderColor:'rgba(251,191,36,0.2)',background:'rgba(251,191,36,0.04)',textDecoration:'none'}}>
                            <span className="text-[12px] font-bold text-white">{w.name}</span>
                            {w.reasons.map(r=>(
                              <span key={r} className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                                style={{background:'rgba(251,191,36,0.12)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.25)'}}>
                                {r}
                              </span>
                            ))}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Per-test grade summary with recharts term bars */}
            <div className="rounded-2xl overflow-hidden"
              style={{background:'rgba(255,255,255,0.015)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="border-b px-5 py-3"
                style={{borderColor:'rgba(255,255,255,0.06)',background:'#0d1424'}}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{color:isG8?'#38bdf8':'#a78bfa'}}>{grade} · {selYear} · Latest results</p>
              </div>
              <div className="divide-y" style={{borderColor:'rgba(255,255,255,0.04)'}}>
                {tests.map(t=>{
                  const vals=gradeStudents.map(s=>{const r=latestMap[s.id];const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
                  const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
                  const tier=avg!==null?getTier(t.key as any,avg,t.lower):null;
                  const avgs=termAvgs(gradeStudents,t.key);
                  const best=vals.length?(!t.lower?Math.max(...vals):Math.min(...vals)):null;
                  const validTerms=avgs.filter((v):v is number=>v!==null);
                  const improved=validTerms.length>1&&(!t.lower?validTerms[validTerms.length-1]>validTerms[0]:validTerms[validTerms.length-1]<validTerms[0]);

                  // Build recharts data
                  const chartData = TERMS.map((term,i) => ({
                    name: term.replace('Term ','T'),
                    val: avgs[i] ?? null,
                  })).filter(d => d.val !== null);

                  return(
                    <div key={t.key} className="flex items-center gap-3 px-5 py-4">
                      <div className="w-28 shrink-0">
                        <p className="text-[12px] font-bold text-white">{t.label}</p>
                        <p className="text-[10px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>{vals.length} tested</p>
                      </div>
                      <div className="w-24 shrink-0">
                        {avg!==null
                          ?<>
                            <p className="text-[15px] font-black" style={{color:tier?.color}}>{fmtValue(t.key as any,avg)}{t.unit&&t.unit!=='mm:ss'&&<span className="text-[9px] ml-0.5 opacity-50">{t.unit}</span>}</p>
                            {tier&&<TierPill label={tier.label}/>}
                          </>
                          :<p className="text-sm" style={{color:'rgba(255,255,255,0.2)'}}>No data</p>}
                      </div>
                      {/* Mini recharts line */}
                      <div className="flex-1 min-w-0 h-10">
                        {chartData.length > 1 && (
                          <ResponsiveContainer width="100%" height={40}>
                            <LineChart data={chartData} margin={{top:4,right:4,bottom:4,left:4}}>
                              <Line type="monotone" dataKey="val" stroke={improved?'#10b981':'#f87171'} strokeWidth={2} dot={{r:2,fill:improved?'#10b981':'#f87171'}} activeDot={false}/>
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {validTerms.length>1&&(
                          <span className="text-[11px] font-black" style={{color:improved?'#10b981':'#f87171'}}>
                            {improved?'▲':'▼'}
                          </span>
                        )}
                        {best!==null&&(
                          <div className="text-right ml-2">
                            <p className="text-[9px]" style={{color:'rgba(255,255,255,0.25)'}}>Best</p>
                            <p className="text-[11px] font-black text-white">{fmtValue(t.key as any,best)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-center text-[11px]" style={{color:'rgba(255,255,255,0.2)'}}>Select a class above to drill in</p>
          </div>
        )}

        {/* ════════════════════════════════════════
            VIEW B — Class selected: test pills + data
        ════════════════════════════════════════ */}
        {selClass&&(
          <div className="space-y-4">

            {/* Class stat strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'Athletes', val:classStudents.length,                                              color:'white'},
                {label:'Tested',   val:classStudents.filter(s=>latestMap[s.id]).length,                  color:'#10b981'},
                {label:'Groups',   val:Math.max(...classStudents.map(s=>s.training_group||0),0)||0,      color:isG8?'#38bdf8':'#a78bfa'},
              ].map(x=>(
                <div key={x.label} className="rounded-2xl border p-4 text-center"
                  style={{background:'#0d1424',borderColor:'rgba(255,255,255,0.06)'}}>
                  <p className="text-2xl font-black" style={{color:x.color}}>{x.val||'—'}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1" style={{color:'rgba(255,255,255,0.25)'}}>{x.label}</p>
                </div>
              ))}
            </div>

            {/* Test pills */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:'rgba(255,255,255,0.2)'}}>Select a test</p>
              <div className="flex flex-wrap gap-2">
                {tests.map(t=>{
                  const vals=classStudents.map(s=>{const r=latestMap[s.id];const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
                  const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
                  const tier=avg!==null?getTier(t.key as any,avg,t.lower):null;
                  const active=selTest===t.key;
                  return(
                    <button key={t.key} onClick={()=>setSelTest(active?null:t.key)}
                      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] transition"
                      style={{
                        borderColor: active ? (tier?.border||'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.07)',
                        background:  active ? (tier?.bg||'rgba(255,255,255,0.06)') : 'rgba(255,255,255,0.02)',
                        color:       active ? (tier?.color||'white') : 'rgba(255,255,255,0.4)',
                      }}>
                      <span className="font-bold">{t.label}</span>
                      {avg!==null&&tier&&(
                        <span className="text-[11px] font-black" style={{color:tier.color}}>{fmtValue(t.key as any,avg)}</span>
                      )}
                      {!vals.length&&<span className="text-[10px]" style={{color:'rgba(255,255,255,0.2)'}}>no data</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Test selected ── */}
            {selTest&&testObj&&(()=>{
              const vals=classStudents.map(s=>{const r=latestMap[s.id];const v=r?parseFloat(r[testObj.key]):NaN;return isNaN(v)?null:{id:s.id,name:s.full_name.trim().split(' ').pop()||s.full_name,val:v,group:s.training_group};}).filter((x):x is{id:string;name:string;val:number;group:number|null}=>x!==null);
              const sorted=[...vals].sort((a,b)=>!testObj.lower?b.val-a.val:a.val-b.val);
              const avg=vals.length?vals.reduce((a,b)=>a+b.val,0)/vals.length:null;
              const avgTier=avg!==null?getTier(testObj.key as any,avg,testObj.lower):null;
              const avgs=termAvgs(classStudents,testObj.key);
              const validTerms=avgs.filter((v):v is number=>v!==null);
              const improved=validTerms.length>1&&(!testObj.lower?validTerms[validTerms.length-1]>validTerms[0]:validTerms[validTerms.length-1]<validTerms[0]);
              const counts:Record<string,number>={};
              vals.forEach(x=>{const l=getTier(testObj.key as any,x.val,testObj.lower).label;counts[l]=(counts[l]||0)+1;});
              const rawVals=vals.map(v=>v.val);
              const wSwc=calcSwc(rawVals);
              const dMed=calcMedian(rawVals);
              const dSd=calcSd(rawVals);
              const statUnit=testObj.unit==='mm:ss'?'s':testObj.unit;

              // Bar chart data
              const barData = sorted.slice(0,12).map(x => ({
                name: x.name.slice(0,6),
                val: x.val,
                color: getTier(testObj.key as any,x.val,testObj.lower).color,
              }));

              return(
                <div className="rounded-2xl overflow-hidden"
                  style={{background:'rgba(255,255,255,0.015)',border:'1px solid rgba(255,255,255,0.07)'}}>

                  {/* Test header */}
                  <div className="px-5 py-5 border-b flex items-start justify-between gap-4"
                    style={{
                      borderColor: avgTier ? avgTier.border : 'rgba(255,255,255,0.06)',
                      background:  avgTier ? avgTier.bg    : 'rgba(255,255,255,0.02)',
                    }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{color:'rgba(255,255,255,0.35)'}}>{testObj.label}</p>
                      {avg!==null&&avgTier&&(
                        <>
                          <p className="text-4xl font-black" style={{color:avgTier.color}}>
                            {fmtValue(testObj.key as any,avg)}
                            {testObj.unit&&testObj.unit!=='mm:ss'&&<span className="text-base ml-1.5 opacity-40">{testObj.unit}</span>}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <TierPill label={avgTier.label}/>
                            <span className="text-[10px]" style={{color:'rgba(255,255,255,0.3)'}}>class avg · {vals.length}/{classStudents.length} tested</span>
                          </div>
                          {vals.length>2&&(
                            <p className="mt-2 text-[10px]" style={{color:'rgba(255,255,255,0.35)'}}>
                              Median {fmtValue(testObj.key as any,dMed)} · SD {dSd.toFixed(2)}{statUnit} ·{' '}
                              <span style={{color:'rgba(255,255,255,0.55)',fontWeight:700}}>SWC ±{wSwc.toFixed(2)}{statUnit}</span>
                              {' '}— changes smaller than the SWC are normal variation, not real change
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-3 justify-end mb-1">
                        {TERMS.map((term,i)=>(
                          <div key={term} className="text-center">
                            <p className="text-[8px] mb-0.5" style={{color:'rgba(255,255,255,0.25)'}}>{term.replace('Term ','T')}</p>
                            <p className="text-[12px] font-black" style={{color:avgs[i]!==null?(improved?'#10b981':'#f87171'):'rgba(255,255,255,0.15)'}}>
                              {avgs[i]!==null?fmtValue(testObj.key as any,avgs[i]!):'—'}
                            </p>
                          </div>
                        ))}
                      </div>
                      {validTerms.length>1&&(
                        <span className="text-[11px] font-black" style={{color:improved?'#10b981':'#f87171'}}>
                          {improved?'▲ Improving':'▼ Declining'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bar chart */}
                  {barData.length > 0 && (
                    <div className="px-4 pt-4 pb-2 border-b" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                      <ResponsiveContainer width="100%" height={110}>
                        <BarChart data={barData} margin={{top:5,right:5,bottom:0,left:-20}}>
                          <XAxis dataKey="name" tick={{fill:'rgba(255,255,255,0.3)',fontSize:8}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:'rgba(255,255,255,0.2)',fontSize:8}} axisLine={false} tickLine={false}/>
                          {avg && <ReferenceLine y={avg} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3"/>}
                          <Tooltip
                            contentStyle={{background:'rgba(10,15,30,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontSize:10}}
                            itemStyle={{color:'white'}}
                            formatter={(v:any)=>[`${fmtValue(testObj.key as any,v)} ${testObj.unit!=='mm:ss'?testObj.unit:''}`,'']}
                            labelStyle={{color:'rgba(255,255,255,0.4)'}}
                          />
                          <Bar dataKey="val" radius={[4,4,0,0]}>
                            {barData.map((d,i) => <Cell key={i} fill={d.color} fillOpacity={0.7}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Tier breakdown pills */}
                  <div className="px-5 py-3 border-b flex flex-wrap gap-2" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                    {TIERS.map(tier=>{
                      const n=counts[tier.label]||0;
                      return n>0?(
                        <span key={tier.label} className="rounded-full px-3 py-1 text-[10px] font-black"
                          style={{background:tier.bg,color:tier.color,border:`1px solid ${tier.border}`}}>
                          {n} {tier.label}
                        </span>
                      ):null;
                    })}
                    {(classStudents.length-vals.length)>0&&(
                      <span className="rounded-full px-3 py-1 text-[10px] font-bold"
                        style={{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.3)',border:'1px solid rgba(255,255,255,0.08)'}}>
                        {classStudents.length-vals.length} untested
                      </span>
                    )}
                  </div>

                  {/* Athlete rankings */}
                  <div className="divide-y" style={{borderColor:'rgba(255,255,255,0.04)'}}>
                    {sorted.map((x,i)=>{
                      const tier=getTier(testObj.key as any,x.val,testObj.lower);
                      // Latest vs previous result, classified against the class SWC
                      const ser=termSeries(results,x.id,testObj.key,selYear);
                      const hasDelta=ser.length>1;
                      const prevV=hasDelta?ser[ser.length-2].val:NaN;
                      const latV=hasDelta?ser[ser.length-1].val:NaN;
                      const chg=hasDelta?classifyChange(prevV,latV,wSwc,testObj.lower):null;
                      const rawD=hasDelta?(testObj.lower?prevV-latV:latV-prevV):0;
                      const pctDelta=hasDelta&&prevV!==0?Math.abs((rawD/prevV)*100).toFixed(1):null;
                      const pct=percentileRank(rawVals,x.val,testObj.lower);
                      return(
                        <div key={x.id} className="flex items-center gap-3 px-5 py-3">
                          <span className="w-5 shrink-0 text-[10px] text-right" style={{color:'rgba(255,255,255,0.25)'}}>{i+1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-white truncate">{x.name}</p>
                            <p className="text-[10px]" style={{color:'rgba(255,255,255,0.25)'}}>
                              {x.group?`Group ${x.group}`:''}{x.group&&pct!==null?' · ':''}{pct!==null?`P${pct} in class`:''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[13px] font-black" style={{color:tier.color}}>{fmtValue(testObj.key as any,x.val)}</p>
                            <TierPill label={tier.label}/>
                          </div>
                          {hasDelta&&(
                            <span className="shrink-0 w-14 text-right text-[10px] font-black"
                              title={chg==='stable'?'Within normal variation (below SWC)':chg==='improved'?'Meaningful improvement (beyond SWC)':'Meaningful decline (beyond SWC)'}
                              style={{color:chg==='improved'?'#10b981':chg==='declined'?'#f87171':'rgba(255,255,255,0.3)'}}>
                              {chg==='improved'?'▲':chg==='declined'?'▼':'≈'} {pctDelta}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Link to profiles */}
                  <div className="border-t px-5 py-3" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                    <p className="text-[10px]" style={{color:'rgba(255,255,255,0.25)'}}>
                      View individual profiles in{' '}
                      <Link href="/hp/students" className="hover:text-white transition" style={{color:'#38bdf8'}}>Students</Link>
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* No test selected yet */}
            {!selTest&&(
              <div className="rounded-2xl border py-10 text-center"
                style={{background:'rgba(255,255,255,0.01)',borderColor:'rgba(255,255,255,0.05)'}}>
                <p className="text-[13px]" style={{color:'rgba(255,255,255,0.25)'}}>Select a test above to see rankings and trends</p>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}