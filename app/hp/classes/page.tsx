'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];

export default function HPClassesPage() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      const { data } = await supabase.from('hp_students').select('*').eq('is_active', true).order('grade').order('full_name');
      setStudents(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const classStudents = selectedClass
    ? students.filter(s => s.class_group === selectedClass)
    : students;

  const grade8 = classStudents.filter(s => s.grade === 'Grade 8');
  const grade9 = classStudents.filter(s => s.grade === 'Grade 9');

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
          <h1 className="mt-1 text-3xl font-black text-white">Classes</h1>
          <p className="mt-1 text-sm text-slate-500">B, E, F, J, M class groups</p>
        </div>

        {/* Class filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => setSelectedClass(null)}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${!selectedClass ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
            All Classes
          </button>
          {HP_CLASSES.map(c => (
            <button key={c} onClick={() => setSelectedClass(c)}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${selectedClass === c ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
              Class {c}
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm text-slate-400">Loading...</p> : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Grade 8 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-white">Grade 8</h2>
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-black text-sky-300">{grade8.length} students</span>
              </div>
              <div className="space-y-1.5">
                {grade8.map(s => (
                  <Link key={s.id} href={`/hp/students/${s.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-emerald-500/30 transition">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-300">
                      {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{s.full_name}</p>
                      <p className="text-[10px] text-slate-500">{s.class_group ? `Class ${s.class_group}` : 'No class'}</p>
                    </div>
                  </Link>
                ))}
                {grade8.length === 0 && <p className="text-sm text-slate-500">No Grade 8 students{selectedClass ? ` in Class ${selectedClass}` : ''}.</p>}
              </div>
            </div>

            {/* Grade 9 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-white">Grade 9</h2>
                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-black text-violet-300">{grade9.length} students</span>
              </div>
              <div className="space-y-1.5">
                {grade9.map(s => (
                  <Link key={s.id} href={`/hp/students/${s.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-emerald-500/30 transition">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-black text-violet-300">
                      {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{s.full_name}</p>
                      <p className="text-[10px] text-slate-500">{s.class_group ? `Class ${s.class_group}` : 'No class'}</p>
                    </div>
                  </Link>
                ))}
                {grade9.length === 0 && <p className="text-sm text-slate-500">No Grade 9 students{selectedClass ? ` in Class ${selectedClass}` : ''}.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
