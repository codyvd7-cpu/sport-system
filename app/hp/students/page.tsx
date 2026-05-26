'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { useSearchParams } from 'next/navigation';
import { PageLoader, EmptyState, IconUsers, IconPlus, IconTrash, IconSearch } from '@/components/HPIcons';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];
const CLASS_OPTIONS = ['8B','8E','8F','8J','8M','9B','9E','9F','9J','9M'];

function HPStudentsInner() {
  const { showToast } = useToast();
  const [students, setStudents] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState('All');
  const searchParams = useSearchParams();
  const [classFilter, setClassFilter] = React.useState(() => searchParams.get('class') || 'All');
  const [testedFilter] = React.useState(() => searchParams.get('tested') || null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [name, setName] = React.useState('');
  const [grade, setGrade] = React.useState('Grade 8');
  const [hpClass, setHpClass] = React.useState('B');
  const [saving, setSaving] = React.useState(false);

  async function load() {
    try {
      const res = await fetch('/api/hp/students', { credentials: 'include' });
      if (!res.ok) {
        const d = await res.json();
        showToast(`Error: ${d.error}`, 'error');
        setLoading(false);
        return;
      }
      const { students: data } = await res.json();
      const sorted = (data || []).sort((a: Row, b: Row) => {
        const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
        const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
        if (sA !== sB) return sA.localeCompare(sB);
        return a.grade.localeCompare(b.grade);
      });
      setStudents(sorted);
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    }
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/hp/students', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', full_name: name.trim(), grade, class_group: hpClass }),
    });
    const d = await res.json();
    if (!res.ok) { showToast(`Error: ${d.error}`, 'error'); setSaving(false); return; }
    setName(''); setShowAdd(false);
    showToast(`${name.trim()} added ✓`);
    await load(); setSaving(false);
  }

  async function removeStudent(id: string, n: string) {
    if (!confirm(`Remove ${n}?`)) return;
    await fetch('/api/hp/students', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', id }),
    });
    showToast('Student removed');
    await load();
  }

  const filtered = students.filter(s => {
    if (gradeFilter !== 'All' && s.grade !== gradeFilter) return false;
    if (classFilter !== 'All') {
      const g = classFilter[0] === '8' ? 'Grade 8' : 'Grade 9';
      const c = classFilter[1];
      if (s.grade !== g || s.class_group !== c) return false;
    }
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const g8 = students.filter(s => s.grade === 'Grade 8').length;
  const g9 = students.filter(s => s.grade === 'Grade 9').length;

  return (
    <main className="min-h-screen  pb-24 text-white md:pb-0" style={{background:'#030810'}}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{color:"rgba(16,185,129,0.7)"}}>High Performance</p>
            <h1 className="text-4xl font-black text-white tracking-tight leading-none">Students</h1>
            <p className="mt-1 text-sm text-white/35">{students.length} athletes · {g8} Grade 8 · {g9} Grade 9</p>
          </div>
          <button onClick={() => setShowAdd(v => !v)}
            className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-300 hover:bg-emerald-500/20 transition">
            {showAdd ? 'Cancel' : '+ Add Student'}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="mb-4 text-xs font-black uppercase tracking-wide text-emerald-400">New Student</p>
            <form onSubmit={addStudent} className="grid gap-3 sm:grid-cols-4">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                className="sm:col-span-2 rounded-xl border border-white/8 bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
              <select value={grade} onChange={e => setGrade(e.target.value)}
                className="rounded-xl border border-white/8 bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                <option>Grade 8</option>
                <option>Grade 9</option>
              </select>
              <select value={hpClass} onChange={e => setHpClass(e.target.value)}
                className="rounded-xl border border-white/8 bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                {HP_CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
              <button type="submit" disabled={saving || !name.trim()}
                className="sm:col-span-4 rounded-xl border border-emerald-500 bg-emerald-500/15 py-2.5 text-sm font-black text-emerald-300 disabled:opacity-50 hover:bg-emerald-500/25 transition">
                {saving ? 'Adding...' : 'Add Student'}
              </button>
            </form>
          </div>
        )}

        {/* Filters + search */}
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
              className="w-full rounded-xl border border-white/8 bg-[rgba(255,255,255,0.025)] pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['All','Grade 8','Grade 9'].map(f => (
              <button key={f} onClick={() => { setGradeFilter(f); setClassFilter('All'); }}
                className={`rounded-xl px-3 py-2 text-xs font-black transition ${gradeFilter === f && classFilter === 'All' ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border border-white/8 bg-[rgba(255,255,255,0.025)] text-white/35 hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {CLASS_OPTIONS.map(c => (
              <button key={c} onClick={() => { setClassFilter(c); setGradeFilter('All'); }}
                className={`rounded-xl px-2.5 py-2 text-xs font-black transition ${classFilter === c ? 'border border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border border-white/8 bg-[rgba(255,255,255,0.025)] text-white/35 hover:text-white'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p className="mb-3 text-xs text-white/25">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</p>

        {/* Student list */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-14 w-full overflow-hidden rounded-2xl bg-[rgba(255,255,255,0.025)]">
                <div className="h-full w-full" style={{background:'linear-gradient(90deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)',backgroundSize:'200% 100%',animation:'shimmer 1.8s infinite'}}/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<IconUsers className="h-8 w-8"/>} title="No students found" sub="Try adjusting your search or filters"/>
        ) : (
          <div className="space-y-1">
            {filtered.map(s => {
              const grpColors: Record<number,string> = {1:'bg-sky-500/15 text-sky-300',2:'bg-violet-500/15 text-violet-300',3:'bg-amber-500/15 text-amber-300',4:'bg-emerald-500/15 text-emerald-300'};
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)] px-4 py-3 hover:border-white/8 transition">
                  <Link href={`/hp/students/${s.id}`} className="flex flex-1 min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-[10px] font-black" style={{color:"#10b981"}}>
                      {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{s.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/35">{s.grade}</span>
                        {s.class_group && <span className="text-[10px] text-white/25">· Class {s.class_group}</span>}
                        {s.training_group && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${grpColors[s.training_group] || 'bg-slate-700 text-white/70'}`}>
                            G{s.training_group}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <button onClick={() => removeStudent(s.id, s.full_name)}
                    className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/5 p-1.5 text-red-500 hover:bg-red-500/15 transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
export default function HPStudentsPage() {
  return (
    <React.Suspense fallback={<PageLoader label="Loading students"/>}>
      <HPStudentsInner/>
    </React.Suspense>
  );
}