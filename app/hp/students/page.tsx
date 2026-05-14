'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;

export default function HPStudentsPage() {
  const { showToast } = useToast();
  const [students, setStudents] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState('');
  const [grade, setGrade] = React.useState('Grade 8');
  const [saving, setSaving] = React.useState(false);
  const [filter, setFilter] = React.useState('All');

  async function load() {
    const { data } = await supabase.from('hp_students').select('*').eq('is_active', true).order('grade').order('full_name');
    setStudents(data || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('hp_students').insert([{ full_name: name.trim(), grade }]);
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

  const filtered = filter === 'All' ? students : students.filter(s => s.grade === filter);

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/hp" className="text-xs text-slate-500 hover:text-slate-300">← HP Classes</Link>
        </div>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">HP Classes</p>
          <h1 className="mt-1 text-3xl font-black text-white">Students</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add student */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-lg font-black text-white">Add Student</h2>
            <form onSubmit={addStudent} className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
              <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                <option>Grade 8</option>
                <option>Grade 9</option>
              </select>
              <button type="submit" disabled={saving || !name.trim()} className="w-full rounded-xl border border-emerald-500 bg-emerald-500/15 py-2.5 text-sm font-black text-emerald-300 disabled:opacity-50">
                {saving ? 'Adding...' : 'Add Student'}
              </button>
            </form>
          </div>

          {/* Student list */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Roster ({filtered.length})</h2>
              <div className="flex gap-1">
                {['All','Grade 8','Grade 9'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition ${filter === f ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500 hover:text-slate-300'}`}>{f}</button>
                ))}
              </div>
            </div>
            {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {filtered.map(s => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-300">
                      {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/hp/students/${s.id}`} className="block truncate text-sm font-semibold text-white hover:text-emerald-400">{s.full_name}</Link>
                      <p className="text-[10px] text-slate-500">{s.grade}</p>
                    </div>
                    <button onClick={() => removeStudent(s.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-sm text-slate-500">No students yet.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
