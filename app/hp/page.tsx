'use client';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageLoader } from '@/components/HPIcons';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';
import { getCalendarTerm, getCurrentYear, HP_TERMS, getTermDateRange, prevTerm, nextTerm, termFromParam, yearFromParam, getLatestTermWithData } from '@/lib/hpTerm';

type Row = Record<string, any>;

const CLASSES = [
  { id:'8B', grade:'Grade 8', cls:'B' },{ id:'8E', grade:'Grade 8', cls:'E' },
  { id:'8F', grade:'Grade 8', cls:'F' },{ id:'8J', grade:'Grade 8', cls:'J' },
  { id:'8M', grade:'Grade 8', cls:'M' },{ id:'9B', grade:'Grade 9', cls:'B' },
  { id:'9E', grade:'Grade 9', cls:'E' },{ id:'9F', grade:'Grade 9', cls:'F' },
  { id:'9J', grade:'Grade 9', cls:'J' },{ id:'9M', grade:'Grade 9', cls:'M' },
];



const ACTIONS = [
  { href:'/hp/attendance', label:'Take Register',  sub:'Mark class attendance',    color:'#10b981',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { href:'/hp/testing',    label:'Enter Tests',    sub:'Record fitness scores',    color:'#a78bfa',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { href:'/hp/students',   label:'All Students',   sub:'Browse full roster',       color:'#38bdf8',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg> },
  { href:'/hp/trends',     label:'Trends',         sub:'Performance over time',    color:'#f59e0b',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
];

export default function HPDashboard() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [tests, setTests]       = React.useState<Row[]>([]);
  const [attendance, setAtt]    = React.useState<Row[]>([]);
  const [loading, setLoading]   = React.useState(true);
  const [mounted, setMounted]   = React.useState(false);
  const term = getCalendarTerm();
  const year = getCurrentYear();

  React.useEffect(()=>{setTimeout(()=>setMounted(true),60);},[]);

  React.useEffect(()=>{
    fetch(`/api/hp/data?type=dashboard&year=${year}`,{credentials:'include'})
      .then(r=>r.json()).then(d=>{
        setStudents(d.students||[]);setTests(d.tests||[]);setAtt(d.attendance||[]);setLoading(false);
      }).catch(()=>setLoading(false));
  },[]);

  if(loading) return <PageLoader label="High Performance"/>;

  const testedIds = new Set(tests.filter(r=>r.term===term).map(r=>r.student_id));
  const totalStudents = students.length;
  const totalTested   = testedIds.size;
  const totalUntested = totalStudents - totalTested;
  const overallAtt = (() => {
    const recs = attendance;
    if(!recs.length) return null;
    const present = recs.filter(a=>a.status==='Present').length;
    return Math.round((present/recs.length)*100);
  })();

  const classStats = CLASSES.map(c=>{
    const cs = students.filter(s=>s.grade===c.grade&&s.class_group===c.cls);
    const total = cs.length; if(!total) return null;
    const tested = cs.filter(s=>testedIds.has(s.id)).length;
    const pct = Math.round((tested/total)*100);
    const classAtt = attendance.filter(a=>cs.some(s=>s.id===a.student_id));
    const dates = [...new Set(classAtt.map(a=>a.session_date))].slice(0,8);
    const present = classAtt.filter(a=>dates.includes(a.session_date)&&a.status==='Present').length;
    const possible = dates.length*total;
    const attRate = possible>0?Math.round((present/possible)*100):null;
    return {...c,total,tested,pct,attRate};
  }).filter(Boolean) as any[];

  const grade8 = classStats.filter(c=>c.grade==='Grade 8');
  const grade9 = classStats.filter(c=>c.grade==='Grade 9');
  const allDone8 = grade8.every(c=>c.pct===100);
  const allDone9 = grade9.every(c=>c.pct===100);

  const fade = (d: number) => ({ delay: d });

  return(
    <main className="min-h-screen pb-24 text-white md:pb-8" style={{background:'#030810'}}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/3 h-64 w-64 rounded-full blur-[80px]" style={{background:'rgba(16,185,129,0.06)'}}/>
        <div className="absolute top-32 right-0 h-48 w-48 rounded-full blur-[60px]" style={{background:'rgba(167,139,250,0.05)'}}/>
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">

        {/* ── HEADER ── */}
        <FadeUp delay={0}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{color:'rgba(16,185,129,0.7)'}}>
            St Benedict's College
          </p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-4xl font-black tracking-tight leading-none">
              High<br/>
              <span style={{background:'linear-gradient(135deg,#10b981,#38bdf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                Performance
              </span>
            </h1>
            <div className="text-right">
              <p className="text-xs font-bold text-white/40">{term} · {year}</p>
              {overallAtt!==null&&(
                <p className="text-[11px] mt-0.5" style={{color:overallAtt>=80?'#10b981':overallAtt>=60?'#fbbf24':'#f87171'}}>
                  {overallAtt}% avg attendance
                </p>
              )}
            </div>
          </div>
        </FadeUp>

        {/* ── PROGRAMME STATS ── */}
        <FadeUp delay={60}>
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:'Enrolled',  val:totalStudents, color:'white',    href:'/hp/students',              glow:'transparent'},
              {label:'Tested',    val:totalTested,   color:'#10b981',  href:'/hp/students?tested=true',  glow:'rgba(16,185,129,0.08)'},
              {label:'Remaining', val:totalUntested, color:totalUntested>0?'#fbbf24':'rgba(255,255,255,0.15)', href:'/hp/students?tested=false', glow:totalUntested>0?'rgba(251,191,36,0.06)':'transparent'},
            ].map(s=>(
              <HoverCard key={s.label}>
                <Link href={s.href}
                  className="relative overflow-hidden rounded-2xl border p-4 text-center block"
                  style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.07)',boxShadow:`0 0 40px ${s.glow}`}}>
                  <CountUp value={s.val} className="text-3xl font-black leading-none block" style={{color:s.color}}/>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] mt-1.5" style={{color:'rgba(255,255,255,0.25)'}}>{s.label}</p>
                </Link>
              </HoverCard>
            ))}
          </div>
        </FadeUp>

        {/* ── QUICK ACTIONS ── */}
        <FadeUp delay={100}>
          <StaggerList className="grid grid-cols-2 gap-2 sm:grid-cols-4" stagger={40}>
            {ACTIONS.map((a)=>(
              <StaggerItem key={a.href}>
                <HoverCard>
                  <Link href={a.href}
                    className="group relative overflow-hidden rounded-2xl border p-4 block"
                    style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.06)'}}>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{background:`radial-gradient(ellipse at 0% 0%,${a.color}12,transparent 70%)`}}/>
                    <div className="relative">
                      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl transition group-hover:scale-110"
                        style={{background:`${a.color}12`,color:a.color}}>
                        {a.icon}
                      </div>
                      <p className="text-[13px] font-black text-white">{a.label}</p>
                      <p className="text-[10px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>{a.sub}</p>
                    </div>
                  </Link>
                </HoverCard>
              </StaggerItem>
            ))}
          </StaggerList>
        </FadeUp>

        {/* ── GRADE 8 ── */}
        <FadeUp delay={140}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full" style={{background:'rgba(56,189,248,0.5)'}}/>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{color:'#38bdf8'}}>Grade 8</p>
                {allDone8&&<p className="text-[9px]" style={{color:'rgba(16,185,129,0.7)'}}>All classes tested ✓</p>}
              </div>
            </div>
            <a href="/hp/export/grade/8" target="_blank"
              className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-semibold transition hover:text-white"
              style={{borderColor:'rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.3)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>
              Export
            </a>
          </div>
          <StaggerList className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5" stagger={30}>
            {grade8.map((c:any)=>(
              <StaggerItem key={c.id}>
                <ClassCard c={c} accent="#38bdf8"/>
              </StaggerItem>
            ))}
          </StaggerList>
        </FadeUp>

        {/* ── GRADE 9 ── */}
        <FadeUp delay={180}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full" style={{background:'rgba(167,139,250,0.5)'}}/>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{color:'#a78bfa'}}>Grade 9</p>
                {allDone9&&<p className="text-[9px]" style={{color:'rgba(16,185,129,0.7)'}}>All classes tested ✓</p>}
              </div>
            </div>
            <a href="/hp/export/grade/9" target="_blank"
              className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-semibold transition hover:text-white"
              style={{borderColor:'rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.3)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>
              Export
            </a>
          </div>
          <StaggerList className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5" stagger={30}>
            {grade9.map((c:any)=>(
              <StaggerItem key={c.id}>
                <ClassCard c={c} accent="#a78bfa"/>
              </StaggerItem>
            ))}
          </StaggerList>
        </FadeUp>

      </div>
    </main>
  );
}

function ClassCard({c,accent}:{c:any;accent:string}) {
  const done = c.pct===100;
  const none = c.tested===0;

  return(
    <HoverCard>
      <Link href={`/hp/class/${c.id}`}
        className="group relative overflow-hidden rounded-2xl border block"
        style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.06)'}}>
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
        style={{background:`linear-gradient(90deg,transparent,${accent}70,transparent)`}}/>
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{background:`radial-gradient(ellipse at 50% 0%,${accent}0e,transparent 70%)`}}/>

      <div className="relative p-4">
        {/* Class label */}
        <p className="text-3xl font-black leading-none tracking-tight" style={{color:accent}}>
          {c.id}
        </p>
        <p className="text-[10px] mt-1" style={{color:'rgba(255,255,255,0.3)'}}>{c.total} students</p>

        {/* Testing progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{color:'rgba(255,255,255,0.2)'}}>Tested</span>
            <span className="text-[9px] font-black" style={{color:done?'#10b981':accent}}>{c.pct}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{width:`${c.pct}%`,background:done?'#10b981':accent}}/>
          </div>
        </div>

        {/* Status */}
        <div className="mt-2.5">
          {done ? (
            <span className="text-[10px] font-black" style={{color:'#10b981'}}>All tested ✓</span>
          ) : none ? (
            <span className="text-[10px]" style={{color:'rgba(255,255,255,0.2)'}}>Not started</span>
          ) : (
            <span className="text-[10px] font-semibold" style={{color:'#fbbf24'}}>{c.total-c.tested} left</span>
          )}
        </div>

        {/* Attendance */}
        {c.attRate!==null&&(
          <div className="mt-1 flex items-center gap-1">
            <span className="text-[9px]" style={{color:'rgba(255,255,255,0.2)'}}>Att</span>
            <span className="text-[10px] font-bold" style={{color:c.attRate>=80?'#10b981':c.attRate>=60?'#fbbf24':'#f87171'}}>{c.attRate}%</span>
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-3 grid grid-cols-3 gap-1">
          {[
            {href:`/hp/class/${c.id}?tab=attendance`,label:'Reg',color:'#10b981'},
            {href:`/hp/class/${c.id}?tab=testing`,   label:'Test',color:'#a78bfa'},
            {href:`/hp/export/class/${c.id}`,         label:'PDF', color:'rgba(255,255,255,0.3)', external:true},
          ].map(btn=>(
            btn.external ? (
              <a key={btn.label} href={btn.href} target="_blank" onClick={e=>e.stopPropagation()}
                className="flex items-center justify-center rounded-lg py-1.5 text-[9px] font-bold transition"
                style={{background:'rgba(255,255,255,0.04)',color:btn.color,border:'1px solid rgba(255,255,255,0.06)'}}>
                {btn.label}
              </a>
            ) : (
              <Link key={btn.label} href={btn.href} onClick={e=>e.stopPropagation()}
                className="flex items-center justify-center rounded-lg py-1.5 text-[9px] font-bold transition hover:opacity-80"
                style={{background:`${btn.color}10`,color:btn.color,border:`1px solid ${btn.color}20`}}>
                {btn.label}
              </Link>
            )
          ))}
        </div>
      </div>
    </Link>
    </HoverCard>
  );
}
