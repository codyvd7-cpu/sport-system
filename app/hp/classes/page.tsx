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

        {/* Class grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {HP_CLASSES.map(c => {
            const cs = students.filter(s => s.class_group === c);
            const g8 = cs.filter(s => s.grade === 'Grade 8').length;
            const g9 = cs.filter(s => s.grade === 'Grade 9').length;
            return (
              <button key={c} onClick={() => setSelectedClass(selectedClass === c ? null : c)}
                className={`rounded-2xl border p-5 text-center transition hover:scale-[1.03] ${
                  selectedClass === c ? 'border-emerald-500/50 bg-emerald-500/15' : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                }`}>
                <p className={`text-4xl font-black mb-1 ${selectedClass === c ? 'text-emerald-400' : 'text-white'}`}>{c}</p>
                <p className="text-[10px] text-slate-500">{cs.length} students</p>
                {cs.length > 0 && <p className="text-[9px] text-slate-600 mt-0.5">Gr8:{g8} Gr9:{g9}</p>}
              </button>
            );
          })}
        </div>

        {/* Selected class students */}
        {selectedClass && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Class {selectedClass} <span className="text-emerald-400">({classStudents.length} students)</span></h2>
              <button onClick={() => setSelectedClass(null)} className="text-xs text-slate-500 hover:text-slate-300">Clear ×</button>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {classStudents.map(s => (
                <Link key={s.id} href={`/hp/students/${s.id}`}
                  className="flex items-center gap-3 rounded-xl border border-emerald-500/10 bg-slate-950/50 p-3 hover:border-emerald-500/30 transition">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-300">
                    {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.full_name}</p>
                    <p className="text-[10px] text-slate-500">{s.grade}</p>
                  </div>
                </Link>
              ))}
              {classStudents.length === 0 && <p className="text-sm text-slate-500">No students in Class {selectedClass}.</p>}
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-slate-500">Loading...</p>}
      </div>
    </main>
  );
}
