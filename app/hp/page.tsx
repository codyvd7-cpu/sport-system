'use client';
import * as React from 'react';
import Link from 'next/link';

type Row = Record<string, any>;

const CLASSES = [
  { id: '8B', grade: 'Grade 8', cls: 'B' },
  { id: '8E', grade: 'Grade 8', cls: 'E' },
  { id: '8F', grade: 'Grade 8', cls: 'F' },
  { id: '8J', grade: 'Grade 8', cls: 'J' },
  { id: '8M', grade: 'Grade 8', cls: 'M' },
  { id: '9B', grade: 'Grade 9', cls: 'B' },
  { id: '9E', grade: 'Grade 9', cls: 'E' },
  { id: '9F', grade: 'Grade 9', cls: 'F' },
  { id: '9J', grade: 'Grade 9', cls: 'J' },
  { id: '9M', grade: 'Grade 9', cls: 'M' },
];

function getCurrentTerm(): string {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return 'Term 1';
  if (month <= 6) return 'Term 2';
  if (month <= 9) return 'Term 3';
  return 'Term 4';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function ClassCard({ c, term }: { c: any; term: string }) {
  const isGrade8 = c.grade === 'Grade 8';
  const allTested = c.tested === c.total && c.total > 0;
  const noneTested = c.tested === 0;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden transition hover:border-slate-700">
      <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-800 ${isGrade8 ? 'bg-sky-500/5' : 'bg-violet-500/5'}`}>
        <div>
          <p className={`text-xl font-black ${isGrade8 ? 'text-sky-400' : 'text-violet-400'}`}>{c.grade === 'Grade 8' ? '8' : '9'}{c.cls}</p>
          <p className="text-[10px] text-slate-500">{c.total} students</p>
        </div>
        <div>
          {allTested
            ? <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">All tested ✓</span>
            : noneTested
            ? <span className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-500">Not started</span>
            : <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-300">{c.total - c.tested} untested</span>
          }
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">{term} Testing</p>
          <p className="text-[10px] font-black text-slate-400">{c.tested}/{c.total}</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className={`h-full rounded-full transition-all ${allTested ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${c.testPct}%` }} />
        </div>
        {c.lastSession && <p className="mt-2 text-[10px] text-slate-600">Last session: <span className="text-slate-400">{formatDate(c.lastSession)}</span></p>}
        {c.attRate !== null && <p className="text-[10px] text-slate-600">Attendance: <span className={`font-black ${c.attRate >= 80 ? 'text-emerald-400' : c.attRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{c.attRate}%</span></p>}
      </div>
      <div className="grid grid-cols-2 border-t border-slate-800">
        <Link href={`/hp/attendance?class=${c.id}`} className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-black text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition border-r border-slate-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M9 11l3 3L22 4"/></svg>Register
        </Link>
        <Link href={`/hp/testing?class=${c.id}`} className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-black text-slate-400 hover:bg-slate-800 hover:text-violet-400 transition border-r border-slate-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Test
        </Link>
        <a href={`/hp/export/class/${c.id}`} target="_blank" className="col-span-2 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-800 hover:text-slate-300 transition border-t border-slate-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export PDF
        </a>
      </div>
    </div>
  );
}

export default function HPDashboard() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [testResults, setTestResults] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const currentTerm = getCurrentTerm();
  const currentYear = new Date().getFullYear();

  React.useEffect(() => {
    fetch('/api/hp/data?type=dashboard&year=' + currentYear, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setStudents(d.students || []);
        setTestResults(d.tests || []);
        setAttendance(d.attendance || []);
        setLoading(false);
      });
  }, []);

  const classStats = CLASSES.map(c => {
    const cs = students.filter(s => s.grade === c.grade && s.class_group === c.cls);
    const total = cs.length;
    const testedThisTerm = new Set(testResults.filter(r => r.term === currentTerm).map(r => r.student_id));
    const tested = cs.filter(s => testedThisTerm.has(s.id)).length;
    const classAtt = attendance.filter(a => cs.some(s => s.id === a.student_id));
    const lastSession = classAtt[0]?.session_date || null;
    const recentDates = [...new Set(classAtt.map(a => a.session_date))].slice(0, 10);
    const presentCount = classAtt.filter(a => recentDates.includes(a.session_date) && a.status === 'Present').length;
    const possibleCount = recentDates.length * total;
    const attRate = possibleCount > 0 ? Math.round((presentCount / possibleCount) * 100) : null;
    return { ...c, total, tested, lastSession, attRate, testPct: total > 0 ? Math.round((tested / total) * 100) : 0 };
  }).filter(c => c.total > 0);

  const grade8 = classStats.filter(c => c.grade === 'Grade 8');
  const grade9 = classStats.filter(c => c.grade === 'Grade 9');
  const totalStudents = students.length;
  const totalTested = new Set(testResults.filter(r => r.term === currentTerm).map(r => r.student_id)).size;
  const totalUntested = totalStudents - totalTested;

  if (loading) return (
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-900 animate-pulse" />)}
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">St Benedict's College</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">High Performance</h1>
            <p className="mt-1 text-sm text-slate-500">{new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <span className="mt-1 shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300">{currentTerm} · {currentYear}</span>
        </div>

        {/* Programme snapshot */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <p className="text-2xl font-black text-white">{totalStudents}</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">Students</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{totalTested}</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">Tested</p>
          </div>
          <div className={`rounded-2xl border p-4 text-center ${totalUntested > 0 ? 'border-amber-500/20 bg-amber-500/5' : 'border-slate-800 bg-slate-900'}`}>
            <p className={`text-2xl font-black ${totalUntested > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{totalUntested}</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">Untested</p>
          </div>
        </div>

        {/* Grade 8 */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-800" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">Grade 8</p>
            <a href="/hp/export/grade/8" target="_blank" className="text-[9px] font-black text-slate-600 hover:text-sky-400 transition flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Grade
            </a>
            <span className="h-px flex-1 bg-slate-800" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grade8.map(c => <ClassCard key={c.id} c={c} term={currentTerm} />)}
          </div>
        </div>

        {/* Grade 9 */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-800" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Grade 9</p>
            <a href="/hp/export/grade/9" target="_blank" className="text-[9px] font-black text-slate-600 hover:text-violet-400 transition flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Grade
            </a>
            <span className="h-px flex-1 bg-slate-800" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grade9.map(c => <ClassCard key={c.id} c={c} term={currentTerm} />)}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { href: '/hp/attendance', label: 'Take Register', sub: 'Mark attendance', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-emerald-400"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
            { href: '/hp/testing', label: 'Enter Tests', sub: 'Record results', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-violet-400"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, border: 'border-violet-500/20', bg: 'bg-violet-500/5' },
            { href: '/hp/trends', label: 'Trends', sub: 'Performance data', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-sky-400"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>, border: 'border-sky-500/20', bg: 'bg-sky-500/5' },
            { href: '/hp/students', label: 'Students', sub: 'All profiles', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-amber-400"><circle cx="9" cy="7" r="4"/><path d="M3 20c0-3.314 2.686-6 6-6h6c3.314 0 6 2.686 6 6"/></svg>, border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
            { href: '/hp/admin/rollover', label: 'Year End Rollover', sub: 'Promote & graduate', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 text-rose-400"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>, border: 'border-rose-500/20', bg: 'bg-rose-500/5' },
          ].map(a => (
            <Link key={a.href} href={a.href} className={`group rounded-2xl border ${a.border} ${a.bg} p-4 transition hover:scale-[1.02]`}>
              <div className="mb-2">{a.icon}</div>
              <p className="text-sm font-black text-white">{a.label}</p>
              <p className="text-[10px] text-slate-500">{a.sub}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
