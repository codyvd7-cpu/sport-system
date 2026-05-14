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

  const classStudents = selectedClass ? students.filter(s => s.class_group === selectedClass) : [];

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
          <h1 className="mt-1 text-3xl font-black text-white">Classes</h1>
        </div>

        {/* Grade 8 Classes */}
        <div className="mb-8">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-sky-400">Grade 8</p>
          <div className="grid grid-cols-5 gap-3">
            {HP_CLASSES.map(c => {
              const key = `8${c}`;
              const cs = students.filter(s => s.class_group === c && s.grade === 'Grade 8');
              const active = selectedClass === key;
              return (
                <button key={key} onClick={() => setSelectedClass(active ? null : key)}
                  className={`rounded-2xl border p-4 text-center transition hover:scale-[1.03] ${active ? 'border-sky-500/50 bg-sky-500/15' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                  <p className={`text-3xl font-black mb-1 ${active ? 'text-sky-400' : 'text-white'}`}>{c}</p>
                  <p className="text-[10px] text-slate-500">{cs.length}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade 9 Classes */}
        <div className="mb-8">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-violet-400">Grade 9</p>
          <div className="grid grid-cols-5 gap-3">
            {HP_CLASSES.map(c => {
              const key = `9${c}`;
              const cs = students.filter(s => s.class_group === c && s.grade === 'Grade 9');
              const active = selectedClass === key;
              return (
                <button key={key} onClick={() => setSelectedClass(active ? null : key)}
                  className={`rounded-2xl border p-4 text-center transition hover:scale-[1.03] ${active ? 'border-violet-500/50 bg-violet-500/15' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                  <p className={`text-3xl font-black mb-1 ${active ? 'text-violet-400' : 'text-white'}`}>{c}</p>
                  <p className="text-[10px] text-slate-500">{cs.length}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected class students */}
        {selectedClass && (() => {
          const grade = selectedClass.startsWith('8') ? 'Grade 8' : 'Grade 9';
          const cls = selectedClass.slice(1);
          const cs = students.filter(s => s.class_group === cls && s.grade === grade);
          const color = grade === 'Grade 8' ? 'sky' : 'violet';
          return (
            <div className={`rounded-2xl border p-5 ${color === 'sky' ? 'border-sky-500/20 bg-sky-500/5' : 'border-violet-500/20 bg-violet-500/5'}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-white">{grade} — Class {cls} <span className={color === 'sky' ? 'text-sky-400' : 'text-violet-400'}>({cs.length} students)</span></h2>
                <button onClick={() => setSelectedClass(null)} className="text-xs text-slate-500 hover:text-slate-300">Clear ×</button>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {cs.map(s => (
                  <Link key={s.id} href={`/hp/students/${s.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-3 hover:border-emerald-500/30 transition">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${color === 'sky' ? 'bg-sky-500/15 text-sky-300' : 'bg-violet-500/15 text-violet-300'}`}>
                      {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-white">{s.full_name}</p>
                  </Link>
                ))}
                {cs.length === 0 && <p className="text-sm text-slate-500">No students in {grade} Class {cls}.</p>}
              </div>
            </div>
          );
        })()}

        {loading && <p className="text-sm text-slate-500">Loading...</p>}
      </div>
    </main>
  );
}
