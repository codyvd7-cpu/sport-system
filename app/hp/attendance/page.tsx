'use client';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];
const CLASS_OPTIONS = [
  '8B','8E','8F','8J','8M',
  '9B','9E','9F','9J','9M',
];

export default function HPAttendancePage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const urlClass = searchParams.get('class');

  const [students, setStudents] = React.useState<Row[]>([]);
  const [statuses, setStatuses] = React.useState<Record<string, string>>({});
  const [sessionDate, setSessionDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] = React.useState('HP Training');
  const [selectedClass, setSelectedClass] = React.useState<string | null>(urlClass || null);
  const [saving, setSaving] = React.useState(false);
  const [history, setHistory] = React.useState<Row[]>([]);
  

  React.useEffect(() => {
    async function load() {
      const res = await fetch('/api/hp/data?type=attendance', { credentials: 'include' });
      if (!res.ok) return;
      const d = await res.json();
      const s = (d.students || []).sort((a: Row, b: Row) => {
        const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
        const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
        return sA.localeCompare(sB);
      });
      setStudents(s);
      const init: Record<string, string> = {};
      s.forEach((st: Row) => { init[st.id] = 'Present'; });
      setStatuses(init);
      setHistory(d.attendance || []);
    }
    load();
  }, []);

  const classStudents = React.useMemo(() => {
    if (!selectedClass) return students;
    const grade = selectedClass.startsWith('8') ? 'Grade 8' : 'Grade 9';
    const cls = selectedClass.slice(1);
    return students.filter(s => s.grade === grade && s.class_group === cls);
  }, [selectedClass, students]);

  async function saveAttendance() {
    if (classStudents.length === 0) return;
    setSaving(true);
    const records = classStudents.map(s => ({
      student_id: s.id,
      session_date: sessionDate,
      session_type: sessionType,
      status: statuses[s.id] || 'Present',
    }));
    const res = await fetch('/api/hp/data', { method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'save_attendance', date:sessionDate, records })
    });
    if (!res.ok) { const d=await res.json(); showToast(`Error: ${d.error}`); setSaving(false); return; }
    showToast(`Attendance saved — ${classStudents.length} students ✓`);
    // Reload attendance
    const r2 = await fetch('/api/hp/data?type=attendance', { credentials:'include' });
    if (r2.ok) { const d2=await r2.json(); setHistory(d2.attendance||[]); }
    setSaving(false);
  }

  const classHistory = React.useMemo(() => {
    if (!selectedClass) return history;
    const ids = new Set(classStudents.map(s => s.id));
    return history.filter(h => ids.has(h.student_id));
  }, [history, classStudents, selectedClass]);

  const recentDates = [...new Set(classHistory.map(h => h.session_date))].slice(0, 6);

  return (
    <main className="min-h-screen bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
          <h1 className="mt-1 text-3xl font-black text-white">Attendance</h1>
        </div>

        {/* Step 1: Session setup */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-500">Step 1 — Session Details</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Date</label>
              <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Session Type</label>
              <select value={sessionType} onChange={e => setSessionType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                {['HP Training','Gym','Testing','Recovery','Match Prep','Conditioning'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Select class */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-500">Step 2 — Select Class</p>
          <div className="space-y-3">
            <button onClick={() => setSelectedClass(null)}
              className={`w-full rounded-xl border py-2.5 text-sm font-black transition ${!selectedClass ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
              All Students
            </button>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Grade 8</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => {
                  const key = `8${c}`;
                  return (
                    <button key={key} onClick={() => setSelectedClass(key)}
                      className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === key ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-violet-400">Grade 9</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => {
                  const key = `9${c}`;
                  return (
                    <button key={key} onClick={() => setSelectedClass(key)}
                      className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === key ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Take register */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Step 3 — Take Register ({classStudents.length} students)</p>
            <button onClick={() => { const all: Record<string,string> = {...statuses}; classStudents.forEach(s => { all[s.id] = 'Present'; }); setStatuses(all); }}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 transition">
              ✓ All Present
            </button>
          </div>
          <div className="space-y-1.5">
            {classStudents.map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-300">
                  {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <p className="flex-1 min-w-0 truncate text-sm font-semibold text-white">{s.full_name}</p>
                <p className="text-[10px] text-slate-600 mr-2 hidden sm:block">{s.class_group ? `Class ${s.class_group}` : s.grade}</p>
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
            {classStudents.length === 0 && <p className="text-sm text-slate-500">No students. Add students first.</p>}
          </div>
          <button onClick={saveAttendance} disabled={saving || classStudents.length === 0}
            className="mt-4 w-full rounded-xl border border-sky-500 bg-sky-500/15 py-3 text-sm font-black text-sky-300 disabled:opacity-50 transition hover:bg-sky-500/25">
            {saving ? 'Saving...' : `Save Attendance — ${classStudents.length} Students`}
          </button>
        </div>

        {/* History */}
        {recentDates.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-white">Recent Sessions</h2>
              {selectedClass && (() => {
                const total = classHistory.length;
                const attended = classHistory.filter(h => ['Present','Late'].includes(h.status)).length;
                const rate = total > 0 ? Math.round((attended / total) * 100) : null;
                return rate !== null ? (
                  <span className={`rounded-xl border px-3 py-1 text-xs font-black ${rate>=80?'border-emerald-500/30 bg-emerald-500/10 text-emerald-300':rate>=60?'border-amber-500/30 bg-amber-500/10 text-amber-300':'border-red-500/30 bg-red-500/10 text-red-300'}`}>
                    {rate}% attendance rate
                  </span>
                ) : null;
              })()}
            </div>
            <div className="space-y-2">
              {recentDates.map(date => {
                const sess = classHistory.filter(h => h.session_date === date);
                const present = sess.filter(h => ['Present','Late'].includes(h.status)).length;
                const absent = sess.filter(h => h.status === 'Absent').length;
                const sessionT = sess[0]?.session_type || '';
                return (
                  <div key={date} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="text-[10px] text-slate-500">{sessionT}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {absent > 0 && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-400">{absent} absent</span>}
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-black text-emerald-300">{present}/{sess.length}</span>
                    </div>
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
