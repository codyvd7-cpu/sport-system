'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { useSearchParams } from 'next/navigation';
import { PageLoader } from '@/components/HPIcons';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ id: string }> };

const GRADE8_TESTS = ['chin_up_hang','broad_jump','sprint_10m','sprint_30m','run_500m'];
const GRADE9_TESTS = ['pushup_2min','triple_broad_jump','sprint_10m','sprint_30m','run_500m'];
const TEST_LABELS: Record<string,string> = {
  chin_up_hang:'Chin Up Hang', broad_jump:'Broad Jump', sprint_10m:'10m Sprint',
  sprint_30m:'30m Sprint', run_500m:'500m Run', pushup_2min:'Push Ups 2min',
  triple_broad_jump:'Triple Broad Jump',
};
const TIERS = [
  {label:'Outstanding',color:'#10b981'},{label:'Strong',color:'#38bdf8'},
  {label:'On Track',color:'#a78bfa'},{label:'Developing',color:'#fbbf24'},{label:'Needs Work',color:'#94a3b8'},
];

function getCurrentTerm() {
  const m = new Date().getMonth()+1;
  if(m<=3)return'Term 1'; if(m<=6)return'Term 2'; if(m<=9)return'Term 3'; return'Term 4';
}

function fDate(d:string) {
  return new Date(d).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'});
}

function initials(name:string) {
  return name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
}

function getGradeAndClass(id:string) {
  const grade = id[0]==='8'?'Grade 8':'Grade 9';
  const cls = id[1];
  return {grade,cls};
}

export default function ClassProfilePage({params}:PageProps) {
  const {id} = React.use(params);
  const {grade,cls} = getGradeAndClass(id);
  const is8 = grade==='Grade 8';
  const accent = is8?'#38bdf8':'#a78bfa';
  const {showToast} = useToast();

  const [students,setStudents] = React.useState<Row[]>([]);
  const [attendance,setAttendance] = React.useState<Row[]>([]);
  const [testResults,setTestResults] = React.useState<Row[]>([]);
  const [loading,setLoading] = React.useState(true);
  const searchParams = useSearchParams();
  const [tab,setTab] = React.useState<'students'|'attendance'|'testing'>(() => {
    const t = searchParams.get('tab');
    if(t==='attendance'||t==='testing') return t;
    return 'students';
  });
  const term = getCurrentTerm();
  const year = new Date().getFullYear();

  // Attendance form
  const [attDate,setAttDate] = React.useState(()=>new Date().toISOString().split('T')[0]);
  const [attStatuses,setAttStatuses] = React.useState<Record<string,string>>({});
  const [savingAtt,setSavingAtt] = React.useState(false);

  async function load() {
    const sRes = await supabase.from('hp_students').select('*').eq('grade',grade).eq('class_group',cls).eq('is_active',true).order('full_name');
    const squad = sRes.data||[];
    setStudents(squad);
    if(!squad.length){setLoading(false);return;}
    const ids = squad.map(s=>s.id);
    const [aRes,tRes] = await Promise.all([
      supabase.from('hp_attendance').select('*').in('student_id',ids).order('session_date',{ascending:false}).limit(500),
      supabase.from('hp_test_results').select('*').in('student_id',ids).eq('year',year),
    ]);
    setAttendance(aRes.data||[]);
    setTestResults(tRes.data||[]);

    // Pre-populate today's attendance
    const init:Record<string,string>={};
    squad.forEach(s=>{
      const existing=(aRes.data||[]).find(r=>r.student_id===s.id&&r.session_date===new Date().toISOString().split('T')[0]);
      init[s.id]=existing?.status||'Present';
    });
    setAttStatuses(init);
    setLoading(false);
  }

  React.useEffect(()=>{load();},[id]);

  const testedThisTerm = new Set(testResults.filter(r=>r.term===term).map(r=>r.student_id));
  const tested = students.filter(s=>testedThisTerm.has(s.id)).length;
  const sessionsThisMonth = [...new Set(attendance.map(a=>a.session_date))];
  const presentCount = attendance.filter(a=>sessionsThisMonth.slice(0,8).includes(a.session_date)&&a.status==='Present').length;
  const possible = sessionsThisMonth.slice(0,8).length * students.length;
  const attRate = possible>0?Math.round((presentCount/possible)*100):null;

  async function saveAttendance() {
    setSavingAtt(true);
    const ids = students.map(s=>s.id);
    await supabase.from('hp_attendance').delete().eq('session_date',attDate).in('student_id',ids);
    await supabase.from('hp_attendance').insert(students.map(s=>({
      student_id:s.id, session_date:attDate, status:attStatuses[s.id]||'Present',
    })));
    showToast(`Register saved for ${attDate} ✓`);
    await load();
    setSavingAtt(false);
  }

  const sessions = [...new Set(attendance.map(a=>a.session_date))].slice(0,10);

  if(loading) return <PageLoader label="Loading Class"/>;

  return (
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">

        {/* Back */}
        <Link href="/hp" className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          HP Dashboard
        </Link>

        {/* Header */}
        <div className="mb-5 rounded-2xl border border-white/6 p-5 relative overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
          <div className="absolute inset-0" style={{background:`radial-gradient(ellipse at 0% 50%, ${accent}0e, transparent 60%)`}}/>
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 mb-0.5">
                {grade} · Class {cls}
              </p>
              <h1 className="text-4xl font-black tracking-tight" style={{color:accent}}>{id}</h1>
              <p className="mt-1 text-sm text-slate-400">{students.length} students · {term} · {year}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href={`/hp/export/class/${id}`} target="_blank"
                className="flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-xs font-black text-slate-400 hover:text-white transition"
                style={{background:'rgba(255,255,255,0.03)'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export PDF
              </a>
              <Link href={`/hp/testing?class=${id}`}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition"
                style={{background:`${accent}15`,color:accent,border:`1px solid ${accent}30`}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Enter Tests
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="relative mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/5 p-3 text-center" style={{background:'rgba(255,255,255,0.03)'}}>
              <p className="text-xl font-black text-white">{students.length}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-600 mt-0.5">Students</p>
            </div>
            <div className="rounded-xl border border-white/5 p-3 text-center" style={{background:'rgba(255,255,255,0.03)'}}>
              <p className="text-xl font-black" style={{color:tested===students.length?'#10b981':accent}}>{tested}/{students.length}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-600 mt-0.5">Tested</p>
            </div>
            <div className="rounded-xl border border-white/5 p-3 text-center" style={{background:'rgba(255,255,255,0.03)'}}>
              <p className="text-xl font-black" style={{color:attRate===null?'#475569':attRate>=80?'#10b981':attRate>=60?'#fbbf24':'#f87171'}}>
                {attRate!==null?`${attRate}%`:'—'}
              </p>
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-600 mt-0.5">Attendance</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex rounded-2xl border border-white/5 p-1" style={{background:'rgba(255,255,255,0.02)'}}>
          {([['students','Students'],['attendance','Register'],['testing','Testing']] as const).map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-black transition ${tab===key?'bg-white/8 text-white':'text-slate-500 hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── STUDENTS TAB ── */}
        {tab==='students'&&(
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="divide-y divide-white/3">
              {students.map(s=>{
                const isTested = testedThisTerm.has(s.id);
                const sAtt = attendance.filter(a=>a.student_id===s.id);
                const sPresent = sAtt.filter(a=>a.status==='Present').length;
                const sRate = sAtt.length>0?Math.round((sPresent/sAtt.length)*100):null;
                return(
                  <Link key={s.id} href={`/hp/students/${s.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black"
                      style={{background:`${accent}15`,color:accent}}>
                      {initials(s.full_name||'?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{s.full_name}</p>
                      <p className="text-[10px] text-slate-600">Group {s.training_group||'—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sRate!==null&&(
                        <span className="text-[11px] font-semibold" style={{color:sRate>=80?'#10b981':sRate>=60?'#fbbf24':'#f87171'}}>
                          {sRate}%
                        </span>
                      )}
                      <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${isTested?'bg-emerald-500/10 text-emerald-400':'bg-slate-800 text-slate-600'}`}>
                        {isTested?'Tested':'Untested'}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 text-slate-700"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE/REGISTER TAB ── */}
        {tab==='attendance'&&(
          <div className="space-y-4">
            {/* Take register */}
            <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-600 mb-0.5">Take Register</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      {students.filter(s=>(attStatuses[s.id]||'Present')==='Present').length} present
                    </span>
                    {students.filter(s=>attStatuses[s.id]==='Absent').length>0&&(
                      <span className="text-[11px] text-red-400">{students.filter(s=>attStatuses[s.id]==='Absent').length} absent</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)}
                    className="rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500/50 transition"/>
                  <button onClick={saveAttendance} disabled={savingAtt}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black transition disabled:opacity-50"
                    style={{background:`${accent}15`,color:accent,border:`1px solid ${accent}30`}}>
                    {savingAtt&&<div className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin"/>}
                    {savingAtt?'Saving…':'Save'}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-white/3">
                {students.map(s=>{
                  const status = attStatuses[s.id]||'Present';
                  return(
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                        style={{background:`${accent}12`,color:accent}}>
                        {initials(s.full_name||'?')}
                      </div>
                      <p className="flex-1 text-sm font-semibold text-white truncate">{s.full_name}</p>
                      <div className="flex gap-1 shrink-0">
                        {['Present','Late','Absent','Excused'].map(st=>{
                          const active=status===st;
                          const colors:Record<string,{a:string;b:string}> = {
                            Present:{a:'rgba(16,185,129,0.15)',b:'#6ee7b7'},
                            Late:{a:'rgba(251,191,36,0.15)',b:'#fde68a'},
                            Absent:{a:'rgba(248,113,113,0.15)',b:'#fca5a5'},
                            Excused:{a:'rgba(56,189,248,0.15)',b:'#7dd3fc'},
                          };
                          const c=colors[st];
                          return(
                            <button key={st} onClick={()=>setAttStatuses(prev=>({...prev,[s.id]:st}))}
                              className="rounded-lg border px-2 py-1.5 text-[10px] font-black transition"
                              style={active?{background:c.a,color:c.b,border:`1px solid ${c.b}40`}:{background:'rgba(255,255,255,0.03)',color:'#475569',border:'1px solid rgba(255,255,255,0.06)'}}>
                              {st[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* History */}
            {sessions.length>0&&(
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Session History</p>
                {sessions.map(date=>{
                  const recs=attendance.filter(a=>a.session_date===date);
                  const p=recs.filter(r=>r.status==='Present').length;
                  return(
                    <div key={date} className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
                      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                        <p className="text-sm font-black text-white">{fDate(date)}</p>
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-black" style={{background:'rgba(16,185,129,0.08)',color:'#6ee7b7',border:'1px solid rgba(16,185,129,0.15)'}}>
                          {p}/{recs.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 px-5 py-3">
                        {recs.map(r=>{
                          const st=r.status?.toLowerCase()||'';
                          const c=st==='present'?'#6ee7b7':st==='late'?'#fde68a':st==='absent'?'#fca5a5':'#7dd3fc';
                          const bg=st==='present'?'rgba(16,185,129,0.08)':st==='late'?'rgba(251,191,36,0.08)':st==='absent'?'rgba(248,113,113,0.08)':'rgba(56,189,248,0.08)';
                          const student=students.find(s=>s.id===r.student_id);
                          const surname=(student?.full_name||'?').trim().split(' ').pop()||'?';
                          return(
                            <span key={r.id} className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                              style={{background:bg,color:c,border:`1px solid ${c}30`}}>
                              {surname}
                              {r.status!=='Present'&&<span className="ml-1 opacity-60">· {r.status?.[0]}</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TESTING TAB ── */}
        {tab==='testing'&&(
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">{term} Results</p>
              <Link href={`/hp/testing?class=${id}`}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition"
                style={{background:`${accent}12`,color:accent,border:`1px solid ${accent}25`}}>
                Enter Tests →
              </Link>
            </div>
            <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
              <div className="divide-y divide-white/3">
                {students.map(s=>{
                  const sResults=testResults.filter(r=>r.student_id===s.id&&r.term===term);
                  const isTested=testedThisTerm.has(s.id);
                  return(
                    <Link key={s.id} href={`/hp/students/${s.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                        style={{background:`${accent}12`,color:accent}}>
                        {initials(s.full_name||'?')}
                      </div>
                      <p className="flex-1 text-sm font-semibold text-white truncate">{s.full_name}</p>
                      <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black ${isTested?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'bg-slate-800 text-slate-600 border border-slate-700'}`}>
                        {isTested?'Tested ✓':'Not tested'}
                      </span>
                    </Link>
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