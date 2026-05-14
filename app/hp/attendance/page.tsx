'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;

export default function HPAttendancePage() {
  const { showToast } = useToast();
  const [students, setStudents] = React.useState<Row[]>([]);
  const [statuses, setStatuses] = React.useState<Record<string, string>>({});
  const [sessionDate, setSessionDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] = React.useState('HP Training');
  const [saving, setSaving] = React.useState(false);
  const [gradeFilter, setGradeFilter] = React.useState('All');
  const [history, setHistory] = React.useState<Row[]>([]);

  React.useEffect(() => {
    async function load() {
      const [sRes, aRes] = await Promise.all([
        supabase.from('hp_students').select('*').eq('is_active', true).order('grade').order('full_name'),
        supabase.from('hp_attendance').select('*').order('session_date', { ascending: false }).limit(100),
      ]);
      const s = sRes.data || [];
      setStudents(s);
      const init: Record<string, string> = {};
      s.forEach((st: Row) => { init[st.id] = 'Present'; });
      setStatuses(init);
      setHistory(aRes.data || []);
    }
    load();
  }, []);

  const filtered = gradeFilter === 'All' ? students : students.filter(s => s.grade === gradeFilter);

  async function saveAttendance() {
    if (filtered.length === 0) return;
    setSaving(true);
    const records = filtered.map(s => ({ student_id: s.id, session_date: sessionDate, session_type: sessionType, status: statuses[s.id] || 'Present' }));
    await supabase.from('hp_attendance').delete().eq('session_date', sessionDate).in('student_id', filtered.map(s => s.id));
    await supabase.from('hp_attendance').insert(records);
    showToast(`Attendance saved — ${filtered.length} students`);
    const { data } = await supabase.from('hp_attendance').select('*').order('session_date', { ascending: false }).limit(100);
    setHistory(data || []);
    setSaving(false);
  }

  const recentDates = [...new Set(history.map(h => h.session_date))].slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← HP Classes</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">HP Classes</p>
          <h1 className="mt-1 text-3xl font-black text-white">Attendance</h1>
        </div>

        {/* Session setup */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Date</label>
              <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Session Type</label>
              <select value={sessionType} onChange={e => setSessionType(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                {['HP Training','Gym','Testing','Recovery','Match Prep'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Grade</label>
              <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                {['All','Grade 8','Grade 9'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { const all: Record<string,string> = {...statuses}; filtered.forEach(s => { all[s.id] = 'Present'; }); setStatuses(all); }} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 transition">✓ All Present</button>
            <button onClick={saveAttendance} disabled={saving} className="flex-1 rounded-xl border border-sky-500 bg-sky-500/15 py-2 text-sm font-black text-sky-300 disabled:opacity-50">
              {saving ? 'Saving...' : `Save — ${filtered.length} students`}
            </button>
          </div>
        </div>

        {/* Student list */}
        <div className="mb-6 space-y-1.5">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-300">
                {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <p className="flex-1 text-sm font-semibold text-white">{s.full_name}</p>
              <p className="text-[10px] text-slate-600 mr-2">{s.grade}</p>
              <div className="flex gap-1">
                {[{s:'Present',l:'P',a:'bg-emerald-500 text-white'},{s:'Late',l:'L',a:'bg-amber-500 text-white'},{s:'Absent',l:'A',a:'bg-red-500 text-white'},{s:'Excused',l:'E',a:'bg-sky-500 text-white'}].map(btn => (
                  <button key={btn.s} onClick={() => setStatuses(p => ({...p, [s.id]: btn.s}))}
                    className={`h-8 w-8 rounded-lg text-xs font-black transition ${statuses[s.id] === btn.s ? btn.a : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                    {btn.l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recent history */}
        {recentDates.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-lg font-black text-white">Recent Sessions</h2>
            <div className="space-y-2">
              {recentDates.map(date => {
                const sess = history.filter(h => h.session_date === date);
                const present = sess.filter(h => ['Present','Late'].includes(h.status)).length;
                return (
                  <div key={date} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-sm font-semibold text-white">{new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-black text-emerald-300">{present}/{sess.length}</span>
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
