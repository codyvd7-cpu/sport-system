'use client';
import * as React from 'react';
import Link from 'next/link';

type Row = Record<string, any>;
const CLASSES = ['B','E','F','J','M'];

const G8 = [
  { key:'chin_up_hang',  label:'Chin Up Hang',      unit:'s',     higher:true  },
  { key:'broad_jump',    label:'Broad Jump',         unit:'cm',    higher:true  },
  { key:'sprint_10m',    label:'10m Sprint',         unit:'s',     higher:false },
  { key:'sprint_30m',    label:'30m Sprint',         unit:'s',     higher:false },
  { key:'run_500m',      label:'500m Run',           unit:'mm:ss', higher:false },
];
const G9 = [
  { key:'pushup_2min',       label:'2 Min Push Up',    unit:'reps',  higher:true  },
  { key:'triple_broad_jump', label:'Triple Broad Jump', unit:'cm',   higher:true  },
  { key:'sprint_10m',        label:'10m Sprint',        unit:'s',    higher:false },
  { key:'sprint_30m',        label:'30m Sprint',        unit:'s',    higher:false },
  { key:'run_500m',          label:'500m Run',          unit:'mm:ss',higher:false },
];

function toSecs(v: string): number | null {
  if (!v) return null;
  if (v.includes(':')) { const [m,s]=v.split(':').map(Number); return m*60+s; }
  const n = parseFloat(v); return isNaN(n)?null:n;
}
function toMmss(secs: number): string {
  const m=Math.floor(secs/60), s=Math.round(secs%60);
  return m+':'+(s<10?'0':'')+s;
}
function norm(val:number, higher:boolean, min:number, max:number): number {
  if (max===min) return 50;
  return higher ? ((val-min)/(max-min))*100 : (1-(val-min)/(max-min))*100;
}
function calcGroups(students:Row[], results:Record<string,Row>, n:number, tests:typeof G8): Row[] {
  const scored = students.map(s => {
    const r=results[s.id]||{}; let total=0,count=0;
    tests.forEach(t => {
      const all=students.map(st=>{const rv=results[st.id]||{};return t.key==='run_500m'?toSecs(rv[t.key]||''):parseFloat(rv[t.key]||'');}).filter((v):v is number=>v!==null&&!isNaN(v));
      if (all.length<2) return;
      const mn=Math.min(...all),mx=Math.max(...all);
      const val=t.key==='run_500m'?toSecs(r[t.key]||''):parseFloat(r[t.key]||'');
      if (val!==null&&!isNaN(val)){total+=norm(val,t.higher,mn,mx);count++;}
    });
    return {...s, _c: count>0?total/count:null};
  });
  const tested=scored.filter(s=>s._c!==null).sort((a,b)=>b._c-a._c);
  const untested=scored.filter(s=>s._c===null);
  const gs=Math.ceil(tested.length/n);
  return [...tested.map((s,i)=>({...s,_g:Math.min(Math.floor(i/gs)+1,n)})),...untested.map(s=>({...s,_g:null}))];
}

export default function HPTesting() {
  const [students,  setStudents]  = React.useState<Row[]>([]);
  const [term,      setTerm]      = React.useState('Term 2');
  const [year,      setYear]      = React.useState(2026);
  const [date,      setDate]      = React.useState(()=>new Date().toISOString().split('T')[0]);
  const [selClass,  setSelClass]  = React.useState<string|null>(null);
  const [results,   setResults]   = React.useState<Record<string,Row>>({});
  const [saving,    setSaving]    = React.useState<Record<string,boolean>>({});
  const [saved,     setSaved]     = React.useState<Record<string,boolean>>({});
  const [openStu,   setOpenStu]   = React.useState<string|null>(null);
  const [nGroups,   setNGroups]   = React.useState(4);
  const [showGrp,   setShowGrp]   = React.useState(false);
  const [toast,     setToast]     = React.useState('');

  function showToast(msg:string){ setToast(msg); setTimeout(()=>setToast(''),3000); }

  // Load students via API (uses service role key, bypasses RLS)
  React.useEffect(()=>{
    fetch('/api/hp/students',{credentials:'include'})
      .then(r=>r.json())
      .then(d=>setStudents((d.students||[]).sort((a:Row,b:Row)=>{
        if(a.grade!==b.grade) return a.grade.localeCompare(b.grade);
        return a.full_name.localeCompare(b.full_name);
      })));
  },[]);

  // Load existing results via API
  React.useEffect(()=>{
    if (!students.length) return;
    fetch('/api/hp/tests?term='+encodeURIComponent(term)+'&year='+year,{credentials:'include'})
      .then(r=>r.json())
      .then(d=>{
        const r:Record<string,Row>={}, sv:Record<string,boolean>={};
        (d.results||[]).forEach((row:Row)=>{
          r[row.student_id]={...row};
          if (row.run_500m) r[row.student_id].run_500m=toMmss(row.run_500m);
          sv[row.student_id]=true;
        });
        setResults(r); setSaved(sv);
      });
  },[term,year,students.length]);

  // Filtered students
  const cls = React.useMemo(()=>{
    if (!selClass) return students;
    if (selClass==='Grade 8'||selClass==='Grade 9') return students.filter(s=>s.grade===selClass);
    const grade=selClass[0]==='8'?'Grade 8':'Grade 9';
    const letter=selClass[1];
    return students.filter(s=>s.grade===grade&&s.class_group===letter);
  },[selClass,students]);

  const firstGrade = cls.length>0 ? cls[0].grade : null;
  const mixed      = cls.some(s=>s.grade!==firstGrade);
  const tests      = firstGrade==='Grade 9' ? G9 : G8;
  const done       = cls.filter(s=>saved[s.id]).length;

  const grouped = React.useMemo(()=>calcGroups(cls,results,nGroups,tests),[cls,results,nGroups,tests]);

  async function saveResults(sid:string){
    const vals=results[sid]||{};
    setSaving(p=>({...p,[sid]:true}));
    const stu=students.find(s=>s.id===sid);
    const t=stu?.grade==='Grade 9'?G9:G8;
    const payload:Row={student_id:sid,term,year,test_date:date};
    t.forEach(x=>{payload[x.key]=x.key==='run_500m'?toSecs(vals[x.key]||''):(vals[x.key]?parseFloat(vals[x.key]):null);});
    await fetch('/api/hp/tests',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'upsert',payload})});
    setSaved(p=>({...p,[sid]:true}));
    setSaving(p=>({...p,[sid]:false}));
    setOpenStu(null);
    showToast('Results saved ✓');
  }

  async function saveGroups(){
    await Promise.all(grouped.filter(s=>s._g!==null).map(s=>
      fetch('/api/hp/students',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'update_group',id:s.id,training_group:s._g})})
    ));
    setStudents(prev=>prev.map(s=>{const g=grouped.find(gs=>gs.id===s.id);return g?{...s,training_group:g._g}:s;}));
    showToast('Groups saved ✓');
  }

  // Class button helper to avoid template literal issues in JSX
  const selBtnClass = (active:boolean, colour:'sky'|'violet'|'emerald') => {
    const on={sky:'border-sky-500/40 bg-sky-500/15 text-sky-300',violet:'border-violet-500/40 bg-violet-500/15 text-violet-300',emerald:'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'}[colour];
    return 'rounded-xl border py-2.5 text-sm font-black transition '+(active?on:'border-slate-700 bg-slate-800 text-slate-400 hover:text-white');
  };

  return (
    <main className="min-h-screen pt-[54px] text-white lg:pt-0 lg:pb-10" style={{background:'#060c1a'}}>
      {toast&&<div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.4)',borderRadius:12,padding:'11px 20px',color:'#10b981',fontWeight:700,fontSize:13,backdropFilter:'blur(12px)',whiteSpace:'nowrap'}}>{toast}</div>}

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
            <h1 className="mt-1 text-3xl font-black text-white">Testing</h1>
          </div>
          <Link href="/hp/import" className="mt-1 flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M4 12l8-8 8 8M12 4v12"/></svg>
            Bulk Import
          </Link>
        </div>

        {/* Step 1: Setup */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-500">Step 1 — Session Setup</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={term} onChange={e=>setTerm(e.target.value)}
              style={{background:'#0d1424',color:'white'}}
              className="rounded-xl border border-slate-700 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
              {['Term 1','Term 2','Term 3','Term 4'].map(t=><option key={t} style={{background:'#0d1424'}}>{t}</option>)}
            </select>
            <select value={year} onChange={e=>setYear(Number(e.target.value))}
              style={{background:'#0d1424',color:'white'}}
              className="rounded-xl border border-slate-700 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
              {[2025,2026,2027].map(y=><option key={y} style={{background:'#0d1424'}}>{y}</option>)}
            </select>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{background:'#0d1424',color:'white'}}
              className="rounded-xl border border-slate-700 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
          </div>

          {/* Class selector */}
          <div className="mt-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Select Class</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={()=>setSelClass(null)}     className={selBtnClass(selClass===null,      'emerald')}>All</button>
              <button onClick={()=>setSelClass('Grade 8')} className={selBtnClass(selClass==='Grade 8','sky')}>Grade 8</button>
              <button onClick={()=>setSelClass('Grade 9')} className={selBtnClass(selClass==='Grade 9','violet')}>Grade 9</button>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Grade 8</p>
              <div className="grid grid-cols-5 gap-2">
                {CLASSES.map(c=>(
                  <button key={'8'+c} onClick={()=>setSelClass('8'+c)} className={selBtnClass(selClass==='8'+c,'sky')}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-violet-400">Grade 9</p>
              <div className="grid grid-cols-5 gap-2">
                {CLASSES.map(c=>(
                  <button key={'9'+c} onClick={()=>setSelClass('9'+c)} className={selBtnClass(selClass==='9'+c,'violet')}>{c}</button>
                ))}
              </div>
            </div>
          </div>

          {firstGrade&&!mixed&&(
            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5">
              <p className="text-xs text-slate-400">
                <span className="font-black text-white">{firstGrade} tests:</span>{' '}
                {tests.map(t=>t.label+' ('+t.unit+')').join(' · ')}
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Results */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Step 2 — Enter Results</p>
            <span className="text-xs text-slate-500">{done}/{cls.length} complete</span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{width:cls.length>0?(done/cls.length*100)+'%':'0%'}}/>
          </div>

          <div className="space-y-2">
            {cls.length===0&&(
              <p className="py-8 text-center text-sm text-slate-500">
                {students.length===0?'Loading students…':'Select a class above to enter results.'}
              </p>
            )}
            {cls.map(s=>{
              const isOpen=openStu===s.id;
              const isDone=saved[s.id];
              const stuTests=s.grade==='Grade 9'?G9:G8;
              const ini=s.full_name.split(' ').map((n:string)=>n[0]||'').join('').slice(0,2).toUpperCase();
              return (
                <div key={s.id} className={'rounded-2xl border transition '+(isDone?'border-emerald-500/20 bg-emerald-500/5':isOpen?'border-emerald-500/30 bg-emerald-500/5':'border-slate-800 bg-slate-900/50')}>
                  <button onClick={()=>setOpenStu(isOpen?null:s.id)} className="flex w-full items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300">{ini}</div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white">{s.full_name}</p>
                      <p className="text-[10px] text-slate-500">{s.grade}{s.class_group?' · Class '+s.class_group:''}{s.training_group?' · G'+s.training_group:''}</p>
                    </div>
                    {isDone&&<span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">Saved ✓</span>}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={'h-4 w-4 text-slate-500 transition '+(isOpen?'rotate-90':'')}><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  {isOpen&&(
                    <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {stuTests.map(t=>(
                          <div key={t.key}>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">{t.label} ({t.unit})</label>
                            <input
                              type={t.unit==='mm:ss'?'text':'number'}
                              step="any" inputMode="decimal"
                              value={results[s.id]?.[t.key]||''}
                              onChange={e=>setResults(p=>({...p,[s.id]:{...(p[s.id]||{}),[t.key]:e.target.value}}))}
                              placeholder={t.unit==='mm:ss'?'2:05':'—'}
                              style={{background:'#0d1424',color:'white'}}
                              className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"/>
                          </div>
                        ))}
                      </div>
                      <button onClick={()=>saveResults(s.id)} disabled={saving[s.id]}
                        className="mt-4 w-full rounded-xl border border-emerald-500 bg-emerald-500/15 py-2.5 text-sm font-black text-emerald-300 disabled:opacity-50 hover:bg-emerald-500/25 transition">
                        {saving[s.id]?'Saving…':'Save Results'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Groups */}
        {cls.length>0&&done>0&&(
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Step 3 — Assign Training Groups</p>
              <button onClick={()=>setShowGrp(v=>!v)} className="text-xs text-slate-400 hover:text-white transition">{showGrp?'Hide':'Show'} preview</button>
            </div>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <p className="text-sm text-slate-400">Number of groups</p>
              <div className="flex gap-2">
                {[2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setNGroups(n)}
                    className={'rounded-xl border px-4 py-2 text-sm font-black transition '+(nGroups===n?'border-emerald-500/40 bg-emerald-500/15 text-emerald-300':'border-slate-700 bg-slate-800 text-slate-400 hover:text-white')}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {showGrp&&(
              <div className="mb-4 max-h-64 space-y-1 overflow-y-auto">
                {grouped.map(s=>{
                  const gc=[,'bg-sky-500/20 text-sky-300','bg-violet-500/20 text-violet-300','bg-amber-500/20 text-amber-300','bg-emerald-500/20 text-emerald-300'][s._g||0]||'bg-slate-700 text-slate-400';
                  return(
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                      <span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black '+gc}>{s._g||'?'}</span>
                      <span className="flex-1 text-sm text-white">{s.full_name}</span>
                      <span className="text-[10px] text-slate-500">{s._c!==null?'Score: '+s._c.toFixed(0):'Untested'}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={saveGroups}
              className="w-full rounded-xl border border-emerald-500 bg-emerald-500/15 py-2.5 text-sm font-black text-emerald-300 hover:bg-emerald-500/25 transition">
              Save Training Groups
            </button>
            <p className="mt-2 text-center text-[10px] text-slate-600">Best performers → Group 1. Assigned by composite performance score.</p>
          </div>
        )}
      </div>
    </main>
  );
}
