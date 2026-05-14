'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

export default function HPDashboard() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [testResults, setTestResults] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [gradeFilter, setGradeFilter] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      const [sRes, tRes, aRes] = await Promise.all([
        supabase.from('hp_students').select('*').eq('is_active', true).order('full_name'),
        supabase.from('hp_test_results').select('student_id, term, year').eq('year', 2026),
        supabase.from('hp_attendance').select('student_id, session_date').order('session_date', { ascending: false }).limit(500),
      ]);
      setStudents(sRes.data || []);
      setTestResults(tRes.data || []);
      setAttendance(aRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const grade8 = students.filter(s => s.grade === 'Grade 8');
  const grade9 = students.filter(s => s.grade === 'Grade 9');
  const testedIds = new Set(testResults.map(t => t.student_id));
  const untested = students.filter(s => !testedIds.has(s.id));
  const displayStudents = gradeFilter ? students.filter(s => s.grade === gradeFilter) : [];

  if (loading) return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-900 animate-pulse" />)}</div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">St Benedict's College</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">High Performance</h1>
          <p className="mt-1 text-sm text-slate-500">Grade 8 & 9 HP training periods</p>
        </div>

        {/* Grade cards */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          {[
            { grade: 'Grade 8', students: grade8, color: 'sky' },
            { grade: 'Grade 9', students: grade9, color: 'violet' },
          ].map(({ grade, students: gs, color }) => (
            <button key={grade} onClick={() => setGradeFilter(gradeFilter === grade ? null : grade)}
              className={`rounded-2xl border p-5 text-left transition hover:scale-[1.02] ${
                gradeFilter === grade
                  ? color === 'sky' ? 'border-sky-500/50 bg-sky-500/15' : 'border-violet-500/50 bg-violet-500/15'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}>
              <p className={`text-3xl font-black ${color === 'sky' ? 'text-sky-400' : 'text-violet-400'}`}>{gs.length}</p>
              <p className="mt-1 text-sm font-black text-white">{grade}</p>
              <p className="text-xs text-slate-500">{gs.filter(s => !testedIds.has(s.id)).length} untested this term</p>
            </button>
          ))}
        </div>

        {/* Grade students list */}
        {gradeFilter && displayStudents.length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">{gradeFilter} Students</h2>
              <button onClick={() => setGradeFilter(null)} className="text-xs text-slate-500 hover:text-slate-300">Clear ×</button>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {displayStudents.map(s => (
                <Link key={s.id} href={`/hp/students/${s.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-emerald-500/30 transition">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-300">
                    {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{s.full_name}</p>
                    <p className="text-[10px] text-slate-500">{s.class_group ? `Class ${s.class_group}` : s.grade}</p>
                  </div>
                  {!testedIds.has(s.id) && <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black text-amber-400">Untested</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Untested alert */}
        {untested.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-amber-400 mb-1">⚠ Untested This Term</p>
            <p className="text-sm text-white font-semibold">{untested.length} students have no test results for 2026</p>
            <Link href="/hp/testing" className="mt-2 inline-block text-xs text-amber-400 hover:underline">Go to Testing →</Link>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: '/hp/attendance', label: 'Take Register', icon: '✅', color: 'emerald' },
            { href: '/hp/testing', label: 'Enter Tests', icon: '⚡', color: 'violet' },
            { href: '/hp/trends', label: 'View Trends', icon: '📈', color: 'sky' },
            { href: '/hp/classes', label: 'Classes', icon: '📚', color: 'amber' },
          ].map(a => (
            <Link key={a.href} href={a.href} className={`rounded-2xl border p-4 text-center transition hover:scale-[1.02] ${
              a.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/5' :
              a.color === 'violet' ? 'border-violet-500/20 bg-violet-500/5' :
              a.color === 'sky' ? 'border-sky-500/20 bg-sky-500/5' : 'border-amber-500/20 bg-amber-500/5'
            }`}>
              <p className="text-2xl mb-2">{a.icon}</p>
              <p className="text-xs font-black text-white">{a.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
