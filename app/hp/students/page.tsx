'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];

export default function HPStudentsPage() {
  const { showToast } = useToast();
  const [students, setStudents] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState('');
  const [grade, setGrade] = React.useState('Grade 8');
  const [hpClass, setHpClass] = React.useState('B');
  const [saving, setSaving] = React.useState(false);
  const [gradeFilter, setGradeFilter] = React.useState('All');
  const [classFilter, setClassFilter] = React.useState('All');

  async function load() {
    const { data } = await supabase.from('hp_students').select('*').eq('is_active', true);
    // Sort by surname (last word of full_name) alphabetically, then by grade
    const sorted = (data || []).sort((a, b) => {
      const surnameA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
      const surnameB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
      if (surnameA !== surnameB) return surnameA.localeCompare(surnameB);
      return a.grade.localeCompare(b.grade);
    });
    setStudents(sorted);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('hp_students').insert([{ full_name: name.trim(), grade, class_group: hpClass }]);
    setName('');
    showToast('Student added');
    await load();
    setSaving(false);
  }

  async function removeStudent(id: string) {
    if (!confirm('Remove this student?')) return;
    await supabase.from('hp_students').update({ is_active: false }).eq('id', id);
    showToast('Student removed');
    await load();
  }

  const filtered = students.filter(s => {
    if (gradeFilter !== 'All' && s.grade !== gradeFilter) return false;
    if (classFilter !== 'All' && s.class_group !== classFilter) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
          <h1 className="mt-1 text-3xl font-black text-white">Students</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Add student */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-base font-black text-white">Add Student</h2>
            <form onSubmit={addStudent} className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
              <div className="grid grid-cols-2 gap-2">
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                  <option>Grade 8</option>
                  <option>Grade 9</option>
                </select>
                <select value={hpClass} onChange={e => setHpClass(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                  {HP_CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving || !name.trim()}
                className="w-full rounded-xl border border-emerald-500 bg-emerald-500/15 py-2.5 text-sm font-black text-emerald-300 disabled:opacity-50">
                {saving ? 'Adding...' : 'Add Student'}
              </button>
            </form>
          </div>

          {/* Student list */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-black text-white">Roster ({filtered.length})</h2>
              <div className="flex flex-wrap gap-1.5">
                {['All','Grade 8','Grade 9'].map(f => (
                  <button key={f} onClick={() => setGradeFilter(f)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition ${gradeFilter === f ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>{f}</button>
                ))}
                <span className="text-slate-700">|</span>
                {['All', ...HP_CLASSES].map(c => (
                  <button key={c} onClick={() => setClassFilter(c)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition ${classFilter === c ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                    {c === 'All' ? 'All Classes' : `Class ${c}`}
                  </button>
                ))}
              </div>
            </div>
            {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {filtered.map(s => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <Link href={`/hp/students/${s.id}`} className="flex flex-1 min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-300">
                        {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white hover:text-emerald-400">{s.full_name}</p>
                        <p className="text-[10px] text-slate-500">{s.grade} · {s.class_group ? `Class ${s.class_group}` : 'No class'}</p>
                      </div>
                    </Link>
                    <button onClick={() => removeStudent(s.id)}
                      className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-sm text-slate-500">No students found.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}