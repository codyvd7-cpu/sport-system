'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];
const TERMS = ['Term 1','Term 2','Term 3'];

const TESTS = [
  { key: 'chin_up_hang',      label: 'Chin Up Hang',  unit: 's',     higher: true,  grade: '8' },
  { key: 'broad_jump',        label: 'Broad Jump',    unit: 'cm',    higher: true,  grade: '8' },
  { key: 'pushup_2min',       label: '2 Min Push Up', unit: 'reps',  higher: true,  grade: '9' },
  { key: 'triple_broad_jump', label: 'Triple Jump',   unit: 'cm',    higher: true,  grade: '9' },
  { key: 'sprint_10m',        label: '10m Sprint',    unit: 's',     higher: false, grade: 'both' },
  { key: 'sprint_30m',        label: '30m Sprint',    unit: 's',     higher: false, grade: 'both' },
  { key: 'run_500m',          label: '500m Run',      unit: 'mm:ss', higher: false, grade: 'both' },
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
  { label:'Outstanding', color:'#10b981', bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.25)' },
  { label:'Strong',      color:'#38bdf8', bg:'rgba(56,189,248,0.12)', border:'rgba(56,189,248,0.25)' },
  { label:'On Track',    color:'#a78bfa', bg:'rgba(167,139,250,0.12)',border:'rgba(167,139,250,0.25)'},
  { label:'Developing',  color:'#fbbf24', bg:'rgba(251,191,36,0.12)', border:'rgba(251,191,36,0.25)' },
  { label:'Needs Work',  color:'#94a3b8', bg:'rgba(148,163,184,0.10)',border:'rgba(148,163,184,0.2)' },
];

function getTier(key:string,val:number,higher:boolean){
  const b=BENCH[key];if(!b)return TIERS[2];
  const[e,g,a,d]=b;
  if(higher){if(val>=e)return TIERS[0];if(val>=g)return TIERS[1];if(val>=a)return TIERS[2];if(val>=d)return TIERS[3];return TIERS[4];}
  else{if(val<=e)return TIERS[0];if(val<=g)return TIERS[1];if(val<=a)return TIERS[2];if(val<=d)return TIERS[3];return TIERS[4];}
}

function fmt(key:string,val:number):string{
  if(key==='run_500m'){const m=Math.floor(val/60),s=Math.round(val%60);return`${m}:${s.toString().padStart(2,'0')}`;}
  if(key==='chin_up_hang'){if(val>=60){const m=Math.floor(val/60),s=val%60;return s?`${m}m${s}s`:`${m}min`;}return`${Math.round(val)}s`;}
  return val%1===0?String(val):val.toFixed(2);
}

function TrendArrow({vals,higher}:{vals:(number|null)[];higher:boolean}){
  const v=vals.filter((x):x is number=>x!==null);
  if(v.length<2)return<span className="text-slate-700 text-xs">—</span>;
  const improved=higher?v[v.length-1]>v[0]:v[v.length-1]<v[0];
  const pct=Math.abs(((v[v.length-1]-v[0])/v[0])*100).toFixed(1);
  return(
    <span className={`text-xs font-black ${improved?'text-emerald-400':'text-red-400'}`}>
      {improved?'▲':'▼'} {pct}%
    </span>
  );
}

export default function HPTrendsPage(){
  const[students,setStudents]=React.useState<Row[]>([]);
  const[results,setResults]=React.useState<Row[]>([]);
  const[loading,setLoading]=React.useState(true);
  const[grade,setGrade]=React.useState<'Grade 8'|'Grade 9'>('Grade 8');
  const[selYear,setSelYear]=React.useState(()=>new Date().getFullYear());
  const[selClass,setSelClass]=React.useState<string|null>(null);

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
  const gradeStudents=students.filter(s=>s.grade===grade);

  const latestMap=React.useMemo(()=>{
    const map:Record<string,Row>={};
    results.filter(r=>r.year===selYear).forEach(r=>{map[r.student_id]=r;});
    return map;
  },[results,selYear]);

  function termAvgs(ss:Row[],key:string){
    return TERMS.map(term=>{
      const vals=ss.map(s=>{
        const r=results.find(r=>r.student_id===s.id&&r.term===term&&r.year===selYear);
        const v=r?parseFloat(r[key]):NaN;return isNaN(v)?null:v;
      }).filter((v):v is number=>v!==null);
      return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    });
  }

  const selClassStudents=React.useMemo(()=>{
    if(!selClass)return[];
    return gradeStudents.filter(s=>s.class_group===selClass[1]);
  },[selClass,gradeStudents]);

  if(loading)return(
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-3">
        {[1,2,3].map(i=><div key={i} className="h-16 rounded-2xl bg-slate-900 animate-pulse"/>)}
      </div>
    </main>
  );

  return(
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">High Performance</p>
            <h1 className="mt-1 text-3xl font-black text-white">Trends</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-0.5">
              {[new Date().getFullYear()-1, new Date().getFullYear()].map(y=>(
                <button key={y} onClick={()=>{setSelYear(y);setSelClass(null);}}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${selYear===y?'bg-slate-700 text-white':'text-slate-500 hover:text-white'}`}>{y}</button>
              ))}
            </div>
            <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-0.5">
              {(['Grade 8','Grade 9'] as const).map(g=>(
                <button key={g} onClick={()=>{setGrade(g);setSelClass(null);}}
                  className={`rounded-lg px-4 py-1.5 text-xs font-black transition ${grade===g?g==='Grade 8'?'bg-sky-500/25 text-sky-300':'bg-violet-500/25 text-violet-300':'text-slate-500 hover:text-white'}`}>{g}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CLASS SELECTED — athlete table ── */}
        {selClass ? (
          <div>
            <div className="mb-5 flex items-center gap-3">
              <button onClick={()=>setSelClass(null)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-black text-slate-400 hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back
              </button>
              <div>
                <h2 className={`text-xl font-black ${grade==='Grade 8'?'text-sky-400':'text-violet-400'}`}>
                  {grade==='Grade 8'?'8':'9'}{selClass[1]}
                </h2>
                <p className="text-xs text-slate-500">{selClassStudents.filter(s=>latestMap[s.id]).length}/{selClassStudents.length} tested</p>
              </div>
            </div>

            {/* Athlete results table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50">
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-600 sticky left-0 bg-slate-950/50">Athlete</th>
                      {tests.map(t=>(
                        <th key={t.key} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-600 whitespace-nowrap">{t.label}</th>
                      ))}
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-600">Grp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {selClassStudents.map(s=>{
                      const r=latestMap[s.id];
                      const surname=s.full_name.trim().split(' ').pop()||s.full_name;
                      return(
                        <tr key={s.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3 sticky left-0 bg-[#030810]">
                            <p className="text-sm font-semibold text-white whitespace-nowrap">{surname}</p>
                            {!r&&<p className="text-[9px] text-amber-500">Untested</p>}
                          </td>
                          {tests.map(t=>{
                            if(!r)return<td key={t.key} className="px-3 py-3 text-center text-slate-700 text-sm">—</td>;
                            const val=parseFloat(r[t.key]);
                            if(isNaN(val))return<td key={t.key} className="px-3 py-3 text-center text-slate-700 text-sm">—</td>;
                            const tier=getTier(t.key,val,t.higher);
                            // T1→T2 delta
                            const r1=results.find(x=>x.student_id===s.id&&x.term==='Term 1'&&x.year===selYear);
                            const r2=results.find(x=>x.student_id===s.id&&x.term==='Term 2'&&x.year===selYear);
                            const v1=r1?parseFloat(r1[t.key]):NaN;
                            const v2=r2?parseFloat(r2[t.key]):NaN;
                            const hasDelta=!isNaN(v1)&&!isNaN(v2);
                            const improved=hasDelta&&(t.higher?v2>v1:v2<v1);
                            return(
                              <td key={t.key} className="px-3 py-3 text-center">
                                <p className="text-xs font-black" style={{color:tier.color}}>{fmt(t.key,val)}</p>
                                <p className="text-[8px] mt-0.5" style={{color:tier.color,opacity:0.6}}>{tier.label}</p>
                                {hasDelta&&<p className={`text-[8px] font-black ${improved?'text-emerald-400':'text-red-400'}`}>{improved?'▲':'▼'}</p>}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-center">
                            {s.training_group
                              ?<span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${[,'bg-sky-500/15 text-sky-300','bg-violet-500/15 text-violet-300','bg-amber-500/15 text-amber-300','bg-emerald-500/15 text-emerald-300'][s.training_group]||''}`}>G{s.training_group}</span>
                              :<span className="text-slate-700 text-[10px]">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Class averages footer */}
              <div className="border-t border-slate-700 bg-slate-950/50">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 sticky left-0 bg-slate-950/50">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Class Avg</p>
                      </td>
                      {tests.map(t=>{
                        const vals=selClassStudents.map(s=>{const r=latestMap[s.id];const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
                        const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
                        const avgs=termAvgs(selClassStudents,t.key);
                        const tier=avg!==null?getTier(t.key,avg,t.higher):null;
                        return(
                          <td key={t.key} className="px-3 py-3 text-center">
                            {avg!==null
                              ?<>
                                <p className="text-xs font-black" style={{color:tier?.color}}>{fmt(t.key,avg)}</p>
                                <TrendArrow vals={avgs} higher={t.higher}/>
                              </>
                              :<span className="text-slate-700 text-xs">—</span>
                            }
                          </td>
                        );
                      })}
                      <td/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        ) : (
          /* ── OVERVIEW — grade stats + class tiles ── */
          <div className="space-y-8">

            {/* Grade test summary — one row per test */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className={`px-5 py-3 border-b border-slate-800 ${grade==='Grade 8'?'bg-sky-500/5':'bg-violet-500/5'}`}>
                <p className={`text-sm font-black ${grade==='Grade 8'?'text-sky-400':'text-violet-400'}`}>{grade} · {selYear}</p>
                <p className="text-xs text-slate-500">{gradeStudents.filter(s=>latestMap[s.id]).length}/{gradeStudents.length} athletes tested</p>
              </div>
              <div className="divide-y divide-slate-800/40">
                {tests.map(t=>{
                  const vals=gradeStudents.map(s=>{const r=latestMap[s.id];const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
                  if(!vals.length)return(
                    <div key={t.key} className="flex items-center justify-between px-5 py-3">
                      <p className="text-sm text-slate-600">{t.label}</p>
                      <p className="text-xs text-slate-700">No data</p>
                    </div>
                  );
                  const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
                  const tier=getTier(t.key,avg,t.higher);
                  const best=t.higher?Math.max(...vals):Math.min(...vals);
                  const avgs=termAvgs(gradeStudents,t.key);
                  const counts:Record<string,number>={};
                  vals.forEach(v=>{const l=getTier(t.key,v,t.higher).label;counts[l]=(counts[l]||0)+1;});
                  return(
                    <div key={t.key} className="flex items-center gap-4 px-5 py-3.5">
                      {/* Test name */}
                      <div className="w-28 shrink-0">
                        <p className="text-xs font-black text-slate-300">{t.label}</p>
                        <p className="text-[10px] text-slate-600">{vals.length} tested</p>
                      </div>
                      {/* Average */}
                      <div className="w-20 shrink-0">
                        <p className="text-base font-black" style={{color:tier.color}}>{fmt(t.key,avg)}{t.unit&&t.unit!=='mm:ss'?<span className="text-[10px] ml-0.5 opacity-50">{t.unit}</span>:null}</p>
                        <p className="text-[9px]" style={{color:tier.color,opacity:0.7}}>{tier.label}</p>
                      </div>
                      {/* Tier dots */}
                      <div className="flex-1 flex flex-wrap gap-1 min-w-0">
                        {TIERS.map(tier=>{const n=counts[tier.label]||0;return n>0?(
                          <span key={tier.label} className="rounded-full px-2 py-0.5 text-[9px] font-black whitespace-nowrap"
                            style={{background:tier.bg,color:tier.color,border:`1px solid ${tier.border}`}}>{n} {tier.label}</span>
                        ):null;})}
                      </div>
                      {/* Trend */}
                      <div className="shrink-0 text-right">
                        <TrendArrow vals={avgs} higher={t.higher}/>
                        <p className="text-[9px] text-slate-600 mt-0.5">Best {fmt(t.key,best)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Class tiles */}
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Drill into a class</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {HP_CLASSES.map(c=>{
                  const cs=gradeStudents.filter(s=>s.class_group===c);
                  if(!cs.length)return null;
                  const tested=cs.filter(s=>latestMap[s.id]).length;
                  const pct=Math.round(tested/cs.length*100);
                  const isG8=grade==='Grade 8';
                  // Count top tiers
                  const outstanding=cs.filter(s=>{
                    const r=latestMap[s.id];if(!r)return false;
                    return tests.some(t=>{const v=parseFloat(r[t.key]);return!isNaN(v)&&getTier(t.key,v,t.higher).label==='Outstanding';});
                  }).length;
                  return(
                    <button key={c} onClick={()=>setSelClass(`${grade==='Grade 8'?'8':'9'}${c}`)}
                      className="group rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-slate-600 hover:scale-[1.02] active:scale-[0.99]">
                      <p className={`text-3xl font-black ${isG8?'text-sky-400':'text-violet-400'}`}>{grade==='Grade 8'?'8':'9'}{c}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{cs.length} athletes</p>
                      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800">
                        <div className={`h-full rounded-full ${pct===100?'bg-emerald-500':isG8?'bg-sky-500':'bg-violet-500'}`} style={{width:`${pct}%`}}/>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-[10px] font-black ${pct===100?'text-emerald-400':pct>50?'text-amber-400':'text-slate-500'}`}>{pct}% tested</span>
                        {outstanding>0&&<span className="text-[9px] text-emerald-400 font-black">{outstanding} ★</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
