'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PageLoader } from '@/components/HPIcons';

type Row = Record<string, any>;

const CLASSES = [
  { id:'8B', grade:'Grade 8', cls:'B' },
  { id:'8E', grade:'Grade 8', cls:'E' },
  { id:'8F', grade:'Grade 8', cls:'F' },
  { id:'8J', grade:'Grade 8', cls:'J' },
  { id:'8M', grade:'Grade 8', cls:'M' },
  { id:'9B', grade:'Grade 9', cls:'B' },
  { id:'9E', grade:'Grade 9', cls:'E' },
  { id:'9F', grade:'Grade 9', cls:'F' },
  { id:'9J', grade:'Grade 9', cls:'J' },
  { id:'9M', grade:'Grade 9', cls:'M' },
];

function getCurrentTerm(): string {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 'Term 1';
  if (m <= 6) return 'Term 2';
  if (m <= 9) return 'Term 3';
  return 'Term 4';
}

function fDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day:'numeric', month:'short' });
}

export default function HPDashboard() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [testResults, setTestResults] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const term = getCurrentTerm();
  const year = new Date().getFullYear();

  React.useEffect(() => {
    async function load() {
      const res = await fetch(`/api/hp/data?type=dashboard&year=${year}`, { credentials: 'include' });
      if (!res.ok) { setLoading(false); return; }
      const d = await res.json();
      setStudents(d.students || []);
      setTestResults(d.tests || []);
      setAttendance(d.attendance || []);
      setLoading(false);
    }
    load();
  }, []);

  const classStats = CLASSES.map(c => {
    const cs = students.filter(s => s.grade === c.grade && s.class_group === c.cls);
    const total = cs.length;
    const testedIds = new Set(testResults.filter(r => r.term === term).map(r => r.student_id));
    const tested = cs.filter(s => testedIds.has(s.id)).length;
    const classAtt = attendance.filter(a => cs.some(s => s.id === a.student_id));
    const lastSession = classAtt[0]?.session_date || null;
    const recentDates = [...new Set(classAtt.map(a => a.session_date))].slice(0, 8);
    const present = classAtt.filter(a => recentDates.includes(a.session_date) && a.status === 'Present').length;
    const possible = recentDates.length * total;
    const attRate = possible > 0 ? Math.round((present / possible) * 100) : null;
    const pct = total > 0 ? Math.round((tested / total) * 100) : 0;
    return { ...c, total, tested, lastSession, attRate, pct };
  }).filter(c => c.total > 0);

  const grade8 = classStats.filter(c => c.grade === 'Grade 8');
  const grade9 = classStats.filter(c => c.grade === 'Grade 9');
  const totalStudents = students.length;
  const totalTested = new Set(testResults.filter(r => r.term === term).map(r => r.student_id)).size;
  const totalUntested = totalStudents - totalTested;

  if (loading) return <PageLoader label="Loading HP"/>;

  return (
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

        {/* ── HEADER ── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-400">St Benedict's · HP</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-white">High Performance</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-300">
              {term} · {year}
            </span>
          </div>
        </div>

        {/* ── STAT STRIP ── */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <Link href="/hp/students"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center hover:border-slate-600 hover:-translate-y-0.5 transition-all">
            <p className="text-2xl font-black text-white">{totalStudents}</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">Students</p>
          </Link>
          <Link href={`/hp/students?tested=true`}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all">
            <p className="text-2xl font-black text-emerald-400">{totalTested}</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">Tested</p>
          </Link>
          <Link href={`/hp/students?tested=false`}
            className={`rounded-2xl border p-4 text-center hover:-translate-y-0.5 transition-all ${totalUntested > 0 ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}>
            <p className={`text-2xl font-black ${totalUntested > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{totalUntested}</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">Untested</p>
          </Link>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="mb-6 grid grid-cols-4 gap-2">
          {[
            { href:'/hp/attendance', label:'Register', color:'#10b981',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { href:'/hp/testing', label:'Testing', color:'#a78bfa',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
            { href:'/hp/students', label:'Students', color:'#38bdf8',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg> },
            { href:'/hp/trends', label:'Trends', color:'#f59e0b',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-white/5 p-3 text-center transition hover:border-white/10 hover:-translate-y-0.5"
              style={{background:'rgba(255,255,255,0.02)'}}>
              <div style={{color:a.color}}>{a.icon}</div>
              <p className="text-[11px] font-black text-slate-400 group-hover:text-white transition">{a.label}</p>
            </Link>
          ))}
        </div>

        {/* ── GRADE 8 ── */}
        <div className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-px w-6 bg-sky-500/40"/>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400">Grade 8</p>
            </div>
            <a href="/hp/export/grade/8" target="_blank"
              className="flex items-center gap-1 text-[10px] font-black text-slate-600 hover:text-sky-400 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Grade
            </a>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {grade8.map(c => <ClassTile key={c.id} c={c} term={term}/>)}
          </div>
        </div>

        {/* ── GRADE 9 ── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-px w-6 bg-violet-500/40"/>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">Grade 9</p>
            </div>
            <a href="/hp/export/grade/9" target="_blank"
              className="flex items-center gap-1 text-[10px] font-black text-slate-600 hover:text-violet-400 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Grade
            </a>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {grade9.map(c => <ClassTile key={c.id} c={c} term={term}/>)}
          </div>
        </div>

      </div>
    </main>
  );
}

function ClassTile({ c, term }: { c: any; term: string }) {
  const is8 = c.grade === 'Grade 8';
  const accent = is8 ? '#38bdf8' : '#a78bfa';
  const allTested = c.tested === c.total && c.total > 0;
  const noneTested = c.tested === 0;

  return (
    <Link href={`/hp/class/${c.id}`}
      className="group relative rounded-2xl border border-white/5 p-4 overflow-hidden transition-all duration-200 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg"
      style={{background:'rgba(255,255,255,0.02)'}}>

      {/* Accent glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{background:`radial-gradient(ellipse at 50% 0%, ${accent}12, transparent 70%)`}}/>

      <div className="relative">
        {/* Class label */}
        <p className="text-2xl font-black leading-none" style={{color:accent}}>
          {is8 ? '8' : '9'}{c.cls}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">{c.total} students</p>

        {/* Progress bar */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full transition-all"
            style={{width:`${c.pct}%`, background:allTested?'#10b981':accent}}/>
        </div>

        {/* Status */}
        <div className="mt-2">
          {allTested
            ? <span className="text-[10px] font-black text-emerald-400">All tested ✓</span>
            : noneTested
            ? <span className="text-[10px] text-slate-600">Not started</span>
            : <span className="text-[10px] font-black text-amber-400">{c.total - c.tested} untested</span>
          }
        </div>

        {/* Attendance */}
        {c.attRate !== null && (
          <p className="mt-1 text-[10px]">
            <span className="text-slate-600">Att </span>
            <span className={`font-black ${c.attRate >= 80 ? 'text-emerald-400' : c.attRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{c.attRate}%</span>
          </p>
        )}

        {/* Quick action links */}
        <div className="mt-3 flex gap-1.5">
          <Link href={`/hp/class/${c.id}?tab=attendance`} onClick={e => e.stopPropagation()}
            className="flex-1 flex items-center justify-center rounded-lg py-1.5 text-[9px] font-black text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/8 transition border border-white/5">
            Register
          </Link>
          <Link href={`/hp/class/${c.id}?tab=testing`} onClick={e => e.stopPropagation()}
            className="flex-1 flex items-center justify-center rounded-lg py-1.5 text-[9px] font-black text-slate-500 hover:text-violet-400 hover:bg-violet-500/8 transition border border-white/5">
            Test
          </Link>
          <a href={`/hp/export/class/${c.id}`} target="_blank" onClick={e => e.stopPropagation()}
            className="flex items-center justify-center rounded-lg px-2 py-1.5 text-[9px] font-black text-slate-600 hover:text-slate-300 hover:bg-white/5 transition border border-white/5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>
          </a>
        </div>
      </div>
    </Link>
  );
}
