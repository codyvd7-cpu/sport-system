'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];
const TERMS = ['Term 1','Term 2','Term 3'];

const TESTS = [
  { key: 'chin_up_hang',      label: 'Chin Up Hang',     unit: 's',     higher: true,  grade: '8' },
  { key: 'broad_jump',        label: 'Broad Jump',        unit: 'cm',    higher: true,  grade: '8' },
  { key: 'pushup_2min',       label: '2 Min Push Up',     unit: 'reps',  higher: true,  grade: '9' },
  { key: 'triple_broad_jump', label: 'Triple Broad Jump', unit: 'cm',    higher: true,  grade: '9' },
  { key: 'sprint_10m',        label: '10m Sprint',        unit: 's',     higher: false, grade: 'both' },
  { key: 'sprint_30m',        label: '30m Sprint',        unit: 's',     higher: false, grade: 'both' },
  { key: 'run_500m',          label: '500m Run',          unit: 'mm:ss', higher: false, grade: 'both' },
];

const BENCH: Record<string,[number,number,number,number]> = {
  chin_up_hang:      [45,25,12,5],
  broad_jump:        [185,165,148,130],
  pushup_2min:       [22,18,14,10],
  triple_broad_jump: [680,600,530,460],
  sprint_10m:        [1.85,1.97,2.10,2.25],
  sprint_30m:        [4.25,4.52,4.80,5.10],
  run_500m:          [100,115,130,150],
};

const TIERS = [
  { label:'Outstanding', short:'Outstanding', color:'#10b981', bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.25)'  },
  { label:'Strong',      short:'Strong',      color:'#38bdf8', bg:'rgba(56,189,248,0.12)',  border:'rgba(56,189,248,0.25)'  },
  { label:'On Track',    short:'On Track',    color:'#a78bfa', bg:'rgba(167,139,250,0.12)', border:'rgba(167,139,250,0.25)' },
  { label:'Developing',  short:'Developing',  color:'#fbbf24', bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.25)'  },
  { label:'Needs Work',  short:'Needs Work',  color:'#94a3b8', bg:'rgba(148,163,184,0.10)', border:'rgba(148,163,184,0.2)'  },
];

function getTier(key:string,val:number,higher:boolean){
  const b=BENCH[key]; if(!b) return TIERS[2];
  const [e,g,a,d]=b;
  if(higher){if(val>=e)return TIERS[0];if(val>=g)return TIERS[1];if(val>=a)return TIERS[2];if(val>=d)return TIERS[3];return TIERS[4];}
  else      {if(val<=e)return TIERS[0];if(val<=g)return TIERS[1];if(val<=a)return TIERS[2];if(val<=d)return TIERS[3];return TIERS[4];}
}

function fmt(key:string,val:number):string{
  if(key==='run_500m'){const m=Math.floor(val/60),s=Math.round(val%60);return `${m}:${s.toString().padStart(2,'0')}`;}
  if(key==='chin_up_hang'){if(val>=60){const m=Math.floor(val/60),s=val%60;return s?`${m}m${s}s`:`${m}min`;}return `${Math.round(val)}s`;}
  return val%1===0?String(val):val.toFixed(2);
}

function getTierScore(key:string,val:number,higher:boolean):number{
  const idx=TIERS.findIndex(x=>x.label===getTier(key,val,higher).label);
  return (4-idx)*25;
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function TierDonut({counts,total}:{counts:Record<string,number>;total:number}){
  const R=34,C=40,stroke=9,circ=2*Math.PI*R;
  let offset=0;
  const segs=TIERS.map(t=>{const n=counts[t.label]||0;const dash=(total>0?n/total:0)*circ;const s={color:t.color,dash,offset,n};offset+=dash;return s;}).filter(s=>s.n>0);
  const top=TIERS.find(t=>(counts[t.label]||0)>0);
  return(
    <svg viewBox={`0 0 ${C*2} ${C*2}`} className="w-20 h-20 shrink-0">
      <circle cx={C} cy={C} r={R} fill="none" stroke="#1e293b" strokeWidth={stroke}/>
      {segs.map((s,i)=>(
        <circle key={i} cx={C} cy={C} r={R} fill="none" stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circ-s.dash}`} strokeDashoffset={-s.offset} strokeLinecap="butt"
          style={{transform:`rotate(-90deg)`,transformOrigin:`${C}px ${C}px`}}/>
      ))}
      {top&&<>
        <text x={C} y={C+2} textAnchor="middle" fontSize="11" fontWeight="900" fill={top.color}>{counts[top.label]||0}</text>
        <text x={C} y={C+13} textAnchor="middle" fontSize="6" fill="#64748b" fontWeight="700">{top.label.split(' ')[0].toUpperCase()}</text>
      </>}
    </svg>
  );
}

// ── Trend line ────────────────────────────────────────────────────────────────
function TrendLine({vals,higher,height=56}:{vals:(number|null)[];higher:boolean;height?:number}){
  const valid=vals.filter((v):v is number=>v!==null);
  if(valid.length<2) return null;
  const mn=Math.min(...valid),mx=Math.max(...valid),rng=mx-mn||1;
  const W=200,H=height;
  const improved=higher?valid[valid.length-1]>valid[0]:valid[valid.length-1]<valid[0];
  const col=improved?'#10b981':'#f87171';
  const pts=vals.map((v,i)=>v!==null?`${(i/(vals.length-1))*W},${H-6-((v-mn)/rng)*(H-12)}`:null).filter(Boolean).join(' ');
  return(
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height}} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gl-${higher}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={col} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {pts&&<polyline points={pts} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
      {vals.map((v,i)=>v!==null?(
        <circle key={i} cx={(i/(vals.length-1))*W} cy={H-6-((v-mn)/rng)*(H-12)} r="4"
          fill={col} stroke="#030810" strokeWidth="2"/>
      ):null)}
    </svg>
  );
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────
function AthleteBar({students,latestMap,testKey,higher}:{students:Row[];latestMap:Record<string,Row>;testKey:string;higher:boolean}){
  const vals=students.map(s=>{
    const r=latestMap[s.id];const v=r?parseFloat(r[testKey]):NaN;
    return{name:s.full_name.trim().split(' ').pop()||s.full_name,val:isNaN(v)?null:v};
  }).filter(x=>x.val!==null) as {name:string;val:number}[];
  if(!vals.length) return <p className="py-4 text-center text-xs text-slate-700">No data yet</p>;
  const sorted=[...vals].sort((a,b)=>higher?b.val-a.val:a.val-b.val);
  const mn=Math.min(...sorted.map(x=>x.val)),mx=Math.max(...sorted.map(x=>x.val));
  return(
    <div className="space-y-1">
      {sorted.map((x,i)=>{
        const tier=getTier(testKey,x.val,higher);
        const pct=mx===mn?85:higher?20+((x.val-mn)/(mx-mn))*75:95-((x.val-mn)/(mx-mn))*75;
        return(
          <div key={i} className="flex items-center gap-2.5">
            <p className="w-[72px] shrink-0 truncate text-[10px] text-slate-400 text-right leading-none">{x.name}</p>
            <div className="flex-1 h-[22px] rounded-lg bg-slate-800/80 overflow-hidden">
              <div className="h-full rounded-lg flex items-center px-2.5 min-w-[32px]"
                style={{width:`${pct}%`,background:`${tier.color}22`,border:`1px solid ${tier.border}`}}>
                <span className="text-[10px] font-black whitespace-nowrap" style={{color:tier.color}}>{fmt(testKey,x.val)}</span>
              </div>
            </div>
            <span className="w-20 shrink-0 text-[9px] font-black" style={{color:tier.color}}>{tier.short}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tier stack bar ────────────────────────────────────────────────────────────
function TierStack({counts,total}:{counts:Record<string,number>;total:number}){
  const noData=total-Object.values(counts).reduce((a,b)=>a+b,0);
  return(
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-xl gap-px">
        {TIERS.map(t=>{const n=counts[t.label]||0;return n>0?(
          <div key={t.label} className="h-full flex items-center justify-center text-[9px] font-black transition-all"
            style={{flex:n,background:t.color,color:'rgba(0,0,0,0.75)'}}>{n}</div>
        ):null;})}
        {noData>0&&<div className="h-full bg-slate-800 flex items-center justify-center text-[9px] text-slate-600" style={{flex:noData}}>{noData}</div>}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {TIERS.map(t=>{const n=counts[t.label]||0;return n>0?<span key={t.label} className="text-[10px] font-black" style={{color:t.color}}>{t.label} {n}</span>:null;})}
        {noData>0&&<span className="text-[10px] text-slate-700">No data {noData}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HPTrendsPage(){
  const [students,setStudents]=React.useState<Row[]>([]);
  const [results,setResults]=React.useState<Row[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [grade,setGrade]=React.useState<'Grade 8'|'Grade 9'>('Grade 8');
  const [selYear,setSelYear]=React.useState(2026);
  const [selClass,setSelClass]=React.useState<string|null>(null);
  const [selTest,setSelTest]=React.useState<string|null>(null);

  React.useEffect(()=>{
    Promise.all([
      supabase.from('hp_students').select('*').eq('is_active',true),
      supabase.from('hp_test_results').select('*').order('year').order('term'),
    ]).then(([s,r])=>{
      const sorted=(s.data||[]).sort((a:Row,b:Row)=>{
        const sA=a.full_name.trim().split(' ').pop()?.toLowerCase()||'';
        const sB=b.full_name.trim().split(' ').pop()?.toLowerCase()||'';
        return sA.localeCompare(sB);
      });
      setStudents(sorted);setResults(r.data||[]);setLoading(false);
    });
  },[]);

  const tests=TESTS.filter(t=>t.grade===grade.split(' ')[1]||t.grade==='both');

  const latestMap=React.useMemo(()=>{
    const map:Record<string,Row>={};
    results.filter(r=>r.year===selYear).forEach(r=>{map[r.student_id]=r;});
    return map;
  },[results,selYear]);

  const gradeStudents=students.filter(s=>s.grade===grade);

  const classData=React.useMemo(()=>HP_CLASSES.map(c=>{
    const cs=students.filter(s=>s.grade===grade&&s.class_group===c);
    const tested=cs.filter(s=>latestMap[s.id]).length;
    const counts:Record<string,number>={};
    cs.forEach(s=>{const r=latestMap[s.id];if(!r)return;tests.forEach(t=>{const v=parseFloat(r[t.key]);if(!isNaN(v)){const tier=getTier(t.key,v,t.higher).label;counts[tier]=(counts[tier]||0)+1;}});});
    const totalCounts=Object.values(counts).reduce((a,b)=>a+b,0);
    return{cls:c,students:cs,tested,counts,totalCounts};
  }).filter(x=>x.students.length>0),[students,grade,latestMap,tests]);

  function termAvgsFor(ss:Row[],key:string){
    return TERMS.map(term=>{
      const vals=ss.map(s=>{const r=results.find(r=>r.student_id===s.id&&r.term===term&&r.year===selYear);const v=r?parseFloat(r[key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
      return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    });
  }

  function mostImproved(ss:Row[],t:{key:string;higher:boolean}){
    const improved=ss.map(s=>{
      const r1=results.find(r=>r.student_id===s.id&&r.term==='Term 1'&&r.year===selYear);
      const r2=results.find(r=>r.student_id===s.id&&r.term==='Term 2'&&r.year===selYear);
      const v1=r1?parseFloat(r1[t.key]):NaN;const v2=r2?parseFloat(r2[t.key]):NaN;
      if(isNaN(v1)||isNaN(v2))return null;
      const delta=t.higher?v2-v1:v1-v2;
      return{name:s.full_name.trim().split(' ').pop()||'',delta,v1,v2};
    }).filter((x):x is{name:string;delta:number;v1:number;v2:number}=>x!==null&&x.delta>0);
    return improved.sort((a,b)=>b.delta-a.delta)[0]||null;
  }

  const selClassData=selClass?classData.find(c=>c.cls===selClass):null;
  const selClassStudents=selClassData?.students||[];

  if(loading) return(
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-4">
        {[1,2,3,4].map(i=><div key={i} className="h-24 rounded-2xl bg-slate-900 animate-pulse"/>)}
      </div>
    </main>
  );

  return(
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
              {[2025,2026,2027].map(y=>(
                <button key={y} onClick={()=>{setSelYear(y);setSelClass(null);setSelTest(null);}}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${selYear===y?'bg-slate-700 text-white':'text-slate-500 hover:text-white'}`}>{y}</button>
              ))}
            </div>
            <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-0.5">
              {(['Grade 8','Grade 9'] as const).map(g=>(
                <button key={g} onClick={()=>{setGrade(g);setSelClass(null);setSelTest(null);}}
                  className={`rounded-lg px-4 py-1.5 text-xs font-black transition ${grade===g?g==='Grade 8'?'bg-sky-500/25 text-sky-300':'bg-violet-500/25 text-violet-300':'text-slate-500 hover:text-white'}`}>{g}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            LANDING — Grade overview + class tiles
        ══════════════════════════════════════════════════════ */}
        {!selClass&&(
          <div className="space-y-8">

            {/* ── GRADE OVERVIEW ── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              {/* Header */}
              <div className={`px-5 py-4 border-b border-slate-800 flex items-center justify-between ${grade==='Grade 8'?'bg-sky-500/5':'bg-violet-500/5'}`}>
                <div>
                  <p className={`text-base font-black ${grade==='Grade 8'?'text-sky-400':'text-violet-400'}`}>{grade} · Programme Overview</p>
                  <p className="text-xs text-slate-500 mt-0.5">{gradeStudents.filter(s=>latestMap[s.id]).length} of {gradeStudents.length} athletes tested in {selYear}</p>
                </div>
                <div className="h-2 w-28 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${grade==='Grade 8'?'bg-sky-500':'bg-violet-500'}`}
                    style={{width:`${gradeStudents.length?Math.round(gradeStudents.filter(s=>latestMap[s.id]).length/gradeStudents.length*100):0}%`}}/>
                </div>
              </div>

              {/* Per-test rows */}
              <div className="divide-y divide-slate-800/40">
                {tests.map(t=>{
                  const vals=gradeStudents.map(s=>{const r=latestMap[s.id];const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
                  if(!vals.length) return null;
                  const avgVal=vals.reduce((a,b)=>a+b,0)/vals.length;
                  const avgTier=getTier(t.key,avgVal,t.higher);
                  const best=t.higher?Math.max(...vals):Math.min(...vals);
                  const counts:Record<string,number>={};
                  vals.forEach(v=>{const tier=getTier(t.key,v,t.higher).label;counts[tier]=(counts[tier]||0)+1;});
                  const termAvgs=termAvgsFor(gradeStudents,t.key);
                  const validTerms=termAvgs.filter((v):v is number=>v!==null);
                  const improved=validTerms.length>1&&(t.higher?validTerms[validTerms.length-1]>validTerms[0]:validTerms[validTerms.length-1]<validTerms[0]);
                  const mi=mostImproved(gradeStudents,t);

                  return(
                    <div key={t.key} className="p-5">
                      {/* Row header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{t.label}</p>
                          <p className="text-2xl font-black mt-0.5" style={{color:avgTier.color}}>
                            {fmt(t.key,avgVal)}
                            {t.unit&&t.unit!=='mm:ss'&&<span className="text-sm ml-1 opacity-40">{t.unit}</span>}
                          </p>
                          <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-black mt-0.5"
                            style={{background:avgTier.bg,color:avgTier.color,border:`1px solid ${avgTier.border}`}}>
                            {avgTier.label} avg
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-slate-600">Best</p>
                          <p className="text-lg font-black text-white">{fmt(t.key,best)}</p>
                          {mi&&(
                            <p className="text-[9px] text-emerald-400 font-black mt-0.5">↑ {mi.name}</p>
                          )}
                        </div>
                      </div>

                      {/* Tier stack */}
                      <TierStack counts={counts} total={gradeStudents.length}/>

                      {/* Term trend */}
                      {validTerms.length>1&&(
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">Term Trend</p>
                            <span className={`text-[10px] font-black ${improved?'text-emerald-400':'text-red-400'}`}>
                              {improved?'▲ Improving':'▼ Declining'}
                            </span>
                          </div>
                          <TrendLine vals={termAvgs} higher={t.higher} height={52}/>
                          <div className="flex justify-between mt-1">
                            {TERMS.map((term,i)=>(
                              <div key={term} className="text-center">
                                <p className="text-[8px] text-slate-700">{term.replace('Term ','T')}</p>
                                <p className="text-[9px] font-black" style={{color:termAvgs[i]!==null?(improved?'#10b981':'#f87171'):'#334155'}}>
                                  {termAvgs[i]!==null?fmt(t.key,termAvgs[i]!):'—'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── CLASS TILES ── */}
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-600">Drill into a class</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classData.map(({cls,students:cs,tested,counts,totalCounts})=>{
                  const isG8=grade==='Grade 8';
                  const pct=cs.length>0?Math.round(tested/cs.length*100):0;
                  return(
                    <button key={cls} onClick={()=>{setSelClass(cls);setSelTest(null);}}
                      className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-slate-600 hover:bg-slate-800/50 hover:scale-[1.02] active:scale-[0.99]">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className={`text-4xl font-black tracking-tight ${isG8?'text-sky-400':'text-violet-400'}`}>
                            {grade==='Grade 8'?'8':'9'}{cls}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{cs.length} athletes</p>
                        </div>
                        <TierDonut counts={counts} total={totalCounts}/>
                      </div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-600">Testing</span>
                        <span className={`text-[10px] font-black ${pct===100?'text-emerald-400':pct>50?'text-amber-400':'text-slate-500'}`}>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800">
                        <div className={`h-full rounded-full ${pct===100?'bg-emerald-500':isG8?'bg-sky-500':'bg-violet-500'}`} style={{width:`${pct}%`}}/>
                      </div>
                      <p className="mt-4 text-[10px] text-slate-700 group-hover:text-slate-500 transition">Explore class →</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            CLASS DETAIL
        ══════════════════════════════════════════════════════ */}
        {selClass&&selClassData&&(()=>{
          const cs=selClassStudents;
          const isG8=grade==='Grade 8';
          const activeTests=selTest?tests.filter(t=>t.key===selTest):tests;

          return(
            <div className="space-y-6">
              {/* Back + header */}
              <div className="flex items-center gap-4">
                <button onClick={()=>{setSelClass(null);setSelTest(null);}}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-black text-slate-400 hover:text-white transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  All Classes
                </button>
                <div>
                  <h2 className={`text-2xl font-black ${isG8?'text-sky-400':'text-violet-400'}`}>
                    {grade==='Grade 8'?'8':'9'}{selClass}
                  </h2>
                  <p className="text-xs text-slate-500">{cs.length} athletes · {selClassData.tested} tested · {selYear}</p>
                </div>
              </div>

              {/* Summary strip — best per test */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-x-auto">
                <div className="flex min-w-[460px]">
                  {tests.map((t,i)=>{
                    const vals=cs.map(s=>{const r=latestMap[s.id];const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
                    const avgVal=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
                    const avgTier=avgVal!==null?getTier(t.key,avgVal,t.higher):null;
                    return(
                      <button key={t.key} onClick={()=>setSelTest(selTest===t.key?null:t.key)}
                        className={`flex-1 px-4 py-4 text-left border-r border-slate-800 last:border-r-0 transition ${selTest===t.key?'bg-slate-800':i%2===0?'bg-slate-900':'bg-slate-900/60'} hover:bg-slate-800/60`}>
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-600 truncate">{t.label}</p>
                        {avgVal!==null
                          ?<><p className="text-base font-black mt-1" style={{color:avgTier?.color}}>{fmt(t.key,avgVal)}</p>
                            <p className="text-[9px] mt-0.5" style={{color:avgTier?.color,opacity:0.7}}>{avgTier?.label}</p></>
                          :<p className="text-sm font-black text-slate-700 mt-1">—</p>
                        }
                        {selTest===t.key&&<div className="mt-2 h-0.5 rounded-full bg-sky-400"/>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Test filter pills */}
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>setSelTest(null)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${!selTest?'border-slate-500 bg-slate-700 text-white':'border-slate-800 bg-slate-900 text-slate-500 hover:text-white'}`}>
                  All Tests
                </button>
                {tests.map(t=>(
                  <button key={t.key} onClick={()=>setSelTest(selTest===t.key?null:t.key)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${selTest===t.key?'border-sky-500/40 bg-sky-500/15 text-sky-300':'border-slate-800 bg-slate-900 text-slate-500 hover:text-white'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Test cards grid */}
              <div className={`grid gap-5 ${selTest?'grid-cols-1 max-w-2xl':'sm:grid-cols-2'}`}>
                {activeTests.map(t=>{
                  const vals=cs.map(s=>{const r=latestMap[s.id];const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
                  const avgVal=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
                  const avgTier=avgVal!==null?getTier(t.key,avgVal,t.higher):null;
                  const best=vals.length?(t.higher?Math.max(...vals):Math.min(...vals)):null;
                  const counts:Record<string,number>={};
                  vals.forEach(v=>{const tier=getTier(t.key,v,t.higher).label;counts[tier]=(counts[tier]||0)+1;});
                  const termAvgs=termAvgsFor(cs,t.key);
                  const validTerms=termAvgs.filter((v):v is number=>v!==null);
                  const improved=validTerms.length>1&&(t.higher?validTerms[validTerms.length-1]>validTerms[0]:validTerms[validTerms.length-1]<validTerms[0]);
                  const mi=mostImproved(cs,t);

                  return(
                    <div key={t.key} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                      {/* Card header */}
                      <div className="px-5 py-4 border-b border-slate-800"
                        style={avgTier?{borderColor:avgTier.border,background:avgTier.bg}:{}}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{t.label}</p>
                            {avgVal!==null&&(
                              <p className="text-2xl font-black mt-0.5" style={{color:avgTier?.color}}>
                                {fmt(t.key,avgVal)}
                                {t.unit&&t.unit!=='mm:ss'&&<span className="text-sm ml-1 opacity-40">{t.unit}</span>}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {avgTier&&<span className="rounded-xl px-2.5 py-1 text-[10px] font-black" style={{background:avgTier.bg,color:avgTier.color,border:`1px solid ${avgTier.border}`}}>{avgTier.label}</span>}
                            <p className="mt-1 text-[10px] text-slate-600">{vals.length}/{cs.length} tested</p>
                          </div>
                        </div>
                        {/* Best + most improved */}
                        <div className="mt-3 flex gap-4 flex-wrap">
                          {best!==null&&(
                            <div>
                              <p className="text-[9px] text-slate-600">Best</p>
                              <p className="text-sm font-black text-white">{fmt(t.key,best)}</p>
                            </div>
                          )}
                          {mi&&(
                            <div>
                              <p className="text-[9px] text-slate-600">Most improved T1→T2</p>
                              <p className="text-sm font-black text-emerald-400">↑ {mi.name}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Tier breakdown */}
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-600">Tier Breakdown</p>
                          <TierStack counts={counts} total={cs.length}/>
                        </div>

                        {/* Term trend */}
                        {validTerms.length>0&&(
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">Term Trend (class avg)</p>
                              {validTerms.length>1&&(
                                <span className={`text-[10px] font-black ${improved?'text-emerald-400':'text-red-400'}`}>
                                  {improved?'▲ Improving':'▼ Declining'}
                                </span>
                              )}
                            </div>
                            <TrendLine vals={termAvgs} higher={t.higher} height={60}/>
                            <div className="flex justify-between mt-1">
                              {TERMS.map((term,i)=>(
                                <div key={term} className="text-center">
                                  <p className="text-[8px] text-slate-700">{term.replace('Term ','T')}</p>
                                  <p className="text-[9px] font-black" style={{color:termAvgs[i]!==null?(improved?'#10b981':'#f87171'):'#334155'}}>
                                    {termAvgs[i]!==null?fmt(t.key,termAvgs[i]!):'—'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Athlete rankings */}
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-600">Athlete Rankings</p>
                          <AthleteBar students={cs} latestMap={latestMap} testKey={t.key} higher={t.higher}/>
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