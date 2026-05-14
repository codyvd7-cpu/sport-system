'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

export default function HPDashboard() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [testResults, setTestResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [sRes, aRes, tRes] = await Promise.all([
          supabase.from('hp_students').select('*').eq('is_active', true),
          supabase.from('hp_attendance').select('*').order('session_date', { ascending: false }).limit(200),
          supabase.from('hp_test_results').select('*').order('test_date', { ascending: false }),
        ]);
        console.log('HP errors:', sRes.error, aRes.error, tRes.error);
        setStudents(sRes.data || []);
        setAttendance(aRes.data || []);
        setTestResults(tRes.data || []);
      } catch(e) {
        console.error('HP load error:', e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const grade8 = students.filter(s => s.grade === 'Grade 8');
  const grade9 = students.filter(s => s.grade === 'Grade 9');
  const recentSessions = [...new Set(attendance.map(a => a.session_date))].slice(0, 5);
  const testedThisTerm = [...new Set(testResults.filter(t => t.term === 'Term 1' && t.year === 2026).map(t => t.student_id))].length;

  if (loading) return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-3 w-24 rounded-full bg-slate-800 animate-pulse mb-2" />
          <div className="h-8 w-64 rounded-full bg-slate-800 animate-pulse mb-2" />
          <div className="h-3 w-48 rounded-full bg-slate-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-900 animate-pulse" />)}
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">St Benedict's College</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">High Performance</h1>
          <p className="mt-1 text-sm text-slate-500">Grade 8 & 9 dedicated HP training periods</p>
        </div>

        {/* KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Students', value: students.length, color: 'emerald' },
            { label: 'Grade 8', value: grade8.length, color: 'sky' },
            { label: 'Grade 9', value: grade9.length, color: 'violet' },
            { label: 'Tested This Term', value: testedThisTerm, color: 'amber' },
          ].map((k) => (
            <div key={k.label} className={`rounded-2xl border bg-slate-900 p-4 ${k.color === 'emerald' ? 'border-emerald-500/20' : k.color === 'sky' ? 'border-sky-500/20' : k.color === 'violet' ? 'border-violet-500/20' : 'border-amber-500/20'}`}>
              <p className={`text-3xl font-black ${k.color === 'emerald' ? 'text-emerald-400' : k.color === 'sky' ? 'text-sky-400' : k.color === 'violet' ? 'text-violet-400' : 'text-amber-400'}`}>{k.value}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: '/hp/attendance', label: 'Take Register', icon: '✅', color: 'emerald' },
            { href: '/hp/testing', label: 'Enter Test Results', icon: '⚡', color: 'violet' },
            { href: '/hp/trends', label: 'View Trends', icon: '📈', color: 'sky' },
            { href: '/hp/students', label: 'Manage Students', icon: '👥', color: 'amber' },
          ].map((a) => (
            <Link key={a.href} href={a.href} className={`rounded-2xl border p-4 text-center transition hover:scale-[1.02] ${a.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/5' : a.color === 'violet' ? 'border-violet-500/20 bg-violet-500/5' : a.color === 'sky' ? 'border-sky-500/20 bg-sky-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
              <p className="text-2xl mb-2">{a.icon}</p>
              <p className="text-xs font-black text-white">{a.label}</p>
            </Link>
          ))}
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Recent Sessions</h2>
              <Link href="/hp/attendance" className="text-xs text-slate-500 hover:text-slate-300">View All →</Link>
            </div>
            <div className="space-y-2">
              {recentSessions.map((date) => {
                const sessionAtt = attendance.filter(a => a.session_date === date);
                const present = sessionAtt.filter(a => ['Present','Late'].includes(a.status)).length;
                return (
                  <div key={date} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-sm font-semibold text-white">{new Date(date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">{present}/{sessionAtt.length} present</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
