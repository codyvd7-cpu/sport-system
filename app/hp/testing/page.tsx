'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];

const GRADE8_TESTS = [
  { key:'chin_up_hang',  label:'Chin Up Hang',      unit:'s',    higher:true  },
  { key:'broad_jump',    label:'Broad Jump',         unit:'cm',   higher:true  },
  { key:'sprint_10m',    label:'10m Sprint',         unit:'s',    higher:false },
  { key:'sprint_30m',    label:'30m Sprint',         unit:'s',    higher:false },
  { key:'run_500m',      label:'500m Run',           unit:'mm:ss',higher:false },
];
const GRADE9_TESTS = [
  { key:'pushup_2min',       label:'2 Min Push Up',    unit:'reps', higher:true  },
  { key:'triple_broad_jump', label:'Triple Broad Jump', unit:'cm',  higher:true  },
  { key:'sprint_10m',        label:'10m Sprint',        unit:'s',   higher:false },
  { key:'sprint_30m',        label:'30m Sprint',        unit:'s',   higher:false },
  { key:'run_500m',          label:'500m Run',          unit:'mm:ss',higher:false},
];

function mmssToSeconds(val: string): number | null {
  if (!val) return null;
  if (val.includes(':')) { const [m,s]=val.split(':').map(Number); return m*60+s; }
  return parseFloat(val) || null;
}
function secondsToMmss(secs: number): string {
  const m=Math.floor(secs/60), s=Math.round(secs%60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}
function normaliseScore(val: number, higher: boolean, min: number, max: number): number {
  if (max===min) return 50;
  return higher ? ((val-min)/(max-min))*100 : (1-(val-min)/(max-min))*100;
}
function assignGroups(students: Row[], results: Record<string,Row>, numGroups: number, tests: typeof GRADE8_TESTS): Row[] {
  const withScores = students.map(s => {
    const r=results[s.id]||{}; let total=0, count=0;
    tests.forEach(t => {
      const allVals=students.map(st=>{const rv=results[st.id]||{};return t.key==='run_500m'?mmssToSeconds(rv[t.key]||''):parseFloat(rv[t.key]||'');}).filter(v=>v!==null&&!isNaN(v as number)) as number[];
      if (allVals.length<2) return;
      const min=Math.min(...allVals), max=Math.max(...allVals);
      const val=t.key==='run_500m'?mmssToSeconds(r[t.key]||''):parseFloat(r[t.key]||'');
      if (val!==null&&!isNaN(val)){total+=normaliseScore(val,t.higher,min,max);count++;}
    });
    return {...s, _composite: count>0?total/count:null};
  });
  const tested=withScores.filter(s=>s._composite!==null).sort((a,b)=>b._composite-a._composite);
  const untested=withScores.filter(s=>s._composite===null);
  const gs=Math.ceil(tested.length/numGroups);
  return [...tested.map((s,i)=>({...s,_group:Math.min(Math.floor(i/gs)+1,numGroups)})),...untested.map(s=>({...s,_group:null}))];
}

export default function HPTestingPage() {
  const { showToast } = useToast();
  const [students,      setStudents]      = React.useState<Row[]>([]);
  const [term,          setTerm]          = React.useState('Term 2');
  const [year,          setYear]          = React.useState(2026);
  const [testDate,      setTestDate]      = React.useState(()=>new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = React.useState<string|null>(null);
  const [results,       setResults]       = React.useState<Record<string,Row>>({});
  const [saving,        setSaving]        = React.useState<Record<string,boolean>>({});
  const [saved,         setSaved]         = React.useState<Record<string,boolean>>({});
  const [activeStudent, setActiveStudent] = React.useState<string|null>(null);
  const [numGroups,     setNumGroups]     = React.useState(4);
  const [groupView,     setGroupView]     = React.useState(false);

  React.useEffect(() => {
    supabase.from('hp_students').select('*').eq('is_active',true).order('grade').order('full_name')
      .then(({data})=>setStudents(data||[]));
  },[]);

  React.useEffect(() => {
    if (!students.length) return;
    supabase.from('hp_test_results').select('*').eq('term',term).eq('year',year)
      .then(({data})=>{
        const pre:typeof results={}, preSaved:typeof saved={};
        (data||[]).forEach(r=>{
          pre[r.student_id]=r;
          if (r.run_500m) pre[r.student_id].run_500m=secondsToMmss(r.run_500m);
          preSaved[r.student_id]=true;
        });
        setResults(pre); setSaved(preSaved);
      });
  },[term,year,students]);

  const classStudents=React.useMemo(()=>{
    if (!selectedClass) return students;
    if (selectedClass==='Grade 8'||selectedClass==='Grade 9') return students.filter(s=>s.grade===selectedClass);
    const grade=selectedClass.startsWith('8')?'Grade 8':'Grade 9';
    return students.filter(s=>s.grade===grade&&s.class_group===selectedClass.slice(1));
  },[selectedClass,students]);

  const grade=classStudents.length>0?classStudents[0].grade:null;
  const tests=grade==='Grade 9'?GRADE9_TESTS:GRADE8_TESTS;
  const mixedGrades=classStudents.some(s=>s.grade!==classStudents[0]?.grade);
  const completed=classStudents.filter(s=>saved[s.id]).length;

  async function saveStudentResults(studentId: string) {
    const vals=results[studentId]||{};
    setSaving(p=>({...p,[studentId]:true}));
    const student=students.find(s=>s.id===studentId);
    const st=student?.grade==='Grade 9'?GRADE9_TESTS:GRADE8_TESTS;
    const payload:Row={student_id:studentId,term,year,test_date:testDate};
    st.forEach(t=>{payload[t.key]=t.key==='run_500m'?mmssToSeconds(vals[t.key]||''):(vals[t.key]?parseFloat(vals[t.key]):null);});
    await supabase.from('hp_test_results').delete().eq('student_id',studentId).eq('term',term).eq('year',year);
    await supabase.from('hp_test_results').insert([payload]);
    setSaved(p=>({...p,[studentId]:true}));
    setSaving(p=>({...p,[studentId]:false}));
    setActiveStudent(null);
    showToast('Results saved');
  }

  async function saveGroups() {
    const gr=assignGroups(classStudents,results,numGroups,tests);
    await Promise.all(gr.filter(s=>s._group!==null).map(s=>supabase.from('hp_students').update({training_group:s._group}).eq('id',s.id)));
    setStudents(prev=>prev.map(s=>{const g=gr.find(gs=>gs.id===s.id);return g?{...s,training_group:g._group}:s;}));
    showToast(`Groups saved — ${numGroups} groups assigned`);
  }

  const grouped=React.useMemo(()=>assignGroups(classStudents,results,numGroups,tests),[classStudents,results,numGroups,tests]);

  return (
    <main className="min-h-screen pt-14 pb-20 text-white lg:pt-0 lg:pb-10" style={{background:'#060c1a'}}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
            <h1 className="mt-1 text-3xl font-black text-white">Testing</h1>
          </div>
          <Link href="/hp/import"
            className="mt-1 flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M4 12l8-8 8 8M12 4v12"/>
            </svg>
            Bulk Import
          </Link>
        </div>

        {/* Step 1 */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-500">Step 1 — Session Setup</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={term} onChange={e=>setTerm(e.target.value)}
              className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 [&>option]:bg-[#0d1424]">
              {['Term 1','Term 2','Term 3','Term 4'].map(t=><option key={t}>{t}</option>)}
            </select>
            <select value={year} onChange={e=>setYear(Number(e.target.value))}
              className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 [&>option]:bg-[#0d1424]">
              {[2025,2026,2027].map(y=><option key={y}>{y}</option>)}
            </select>
            <input type="date" value={testDate} onChange={e=>setTestDate(e.target.value)}
              className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"/>
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Select Class</p>
            <div className="grid grid-cols-3 gap-2">
              {[{k:null as string|null,l:'All'},{k:'Grade 8',l:'Grade 8'},{k:'Grade 9',l:'Grade 9'}].map(({k,l})=>(
                <button key={l} onClick={()=>setSelectedClass(k)}
                  className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass===k?'border-emerald-500/40 bg-emerald-500/15 text-emerald-300':'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>{l}</button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Grade 8</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c=>(
                  <button key={`8${c}`} onClick={()=>setSelectedClass(`8${c}`)}
                    className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass===`8${c}`?'border-sky-500/40 bg-sky-500/15 text-sky-300':'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-violet-400">Grade 9</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c=>(
                  <button key={`9${c}`} onClick={()=>setSelectedClass(`9${c}`)}
                    className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass===`9${c}`?'border-violet-500/40 bg-violet-500/15 text-violet-300':'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          {grade&&!mixedGrades&&(
            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5">
              <p className="text-xs text-slate-400"><span className="font-black text-white">{grade} tests:</span>{' '}{tests.map(t=>`${t.label} (${t.unit})`).join(' · ')}</p>
            </div>
          )}
        </div>

        {/* Step 2 */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Step 2 — Enter Results</p>
            <span className="text-xs text-slate-500">{completed}/{classStudents.length} complete</span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{width:`${classStudents.length>0?(completed/classStudents.length)*100:0}%`}}/>
          </div>
          <div className="space-y-2">
            {classStudents.map(s=>{
              const isOpen=activeStudent===s.id, isDone=saved[s.id];
              const st=s.grade==='Grade 9'?GRADE9_TESTS:GRADE8_TESTS;
              return (
                <div key={s.id} className={`rounded-2xl border transition ${isDone?'border-emerald-500/20 bg-emerald-500/5':isOpen?'border-emerald-500/30 bg-emerald-500/5':'border-slate-800 bg-slate-900/50'}`}>
                  <button onClick={()=>setActiveStudent(isOpen?null:s.id)} className="flex w-full items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300">
                      {s.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white">{s.full_name}</p>
                      <p className="text-[10px] text-slate-500">{s.grade}{s.class_group?` · Class ${s.class_group}`:''}{s.training_group?` · G${s.training_group}`:''}</p>
                    </div>
                    {isDone&&<span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">Saved ✓</span>}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-4 w-4 text-slate-500 transition ${isOpen?'rotate-90':''}`}><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  {isOpen&&(
                    <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {st.map(t=>(
                          <div key={t.key}>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">{t.label} ({t.unit})</label>
                            <input type={t.unit==='mm:ss'?'text':'number'} step="any" inputMode="decimal"
                              value={results[s.id]?.[t.key]||''}
                              onChange={e=>setResults(p=>({...p,[s.id]:{...(p[s.id]||{}),[t.key]:e.target.value}}))}
                              placeholder={t.unit==='mm:ss'?'2:05':'—'}
                              className="w-full rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"/>
                          </div>
                        ))}
                      </div>
                      <button onClick={()=>saveStudentResults(s.id)} disabled={saving[s.id]}
                        className="mt-4 w-full rounded-xl border border-emerald-500 bg-emerald-500/15 py-2.5 text-sm font-black text-emerald-300 disabled:opacity-50 hover:bg-emerald-500/25 transition">
                        {saving[s.id]?'Saving...':'Save Results'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {classStudents.length===0&&<p className="py-8 text-center text-sm text-slate-500">Select a class above to enter results.</p>}
          </div>
        </div>

        {/* Step 3: Groups */}
        {classStudents.length>0&&completed>0&&(
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Step 3 — Assign Training Groups</p>
              <button onClick={()=>setGroupView(v=>!v)} className="text-xs text-slate-400 hover:text-white transition">{groupView?'Hide':'Show'} preview</button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <p className="text-sm text-slate-400">Number of groups</p>
              <div className="flex gap-2">
                {[2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setNumGroups(n)}
                    className={`rounded-xl border px-4 py-2 text-sm font-black transition ${numGroups===n?'border-emerald-500/40 bg-emerald-500/15 text-emerald-300':'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>{n}</button>
                ))}
              </div>
            </div>
            {groupView&&(
              <div className="mb-4 max-h-64 space-y-1 overflow-y-auto">
                {grouped.map(s=>(
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${s._group===1?'bg-sky-500/20 text-sky-300':s._group===2?'bg-violet-500/20 text-violet-300':s._group===3?'bg-amber-500/20 text-amber-300':'bg-emerald-500/20 text-emerald-300'}`}>{s._group||'?'}</span>
                    <span className="flex-1 text-sm text-white">{s.full_name}</span>
                    <span className="text-[10px] text-slate-500">{s._composite!==null?`Score: ${s._composite.toFixed(0)}`:'Untested'}</span>
                  </div>
                ))}
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
