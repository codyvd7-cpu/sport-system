'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];

const GRADE8_TESTS = [
  { key: 'chin_up_hang', higher: true },
  { key: 'broad_jump', higher: true },
  { key: 'sprint_10m', higher: false },
  { key: 'sprint_30m', higher: false },
  { key: 'run_500m', higher: false },
];
const GRADE9_TESTS = [
  { key: 'pushup_2min', higher: true },
  { key: 'triple_broad_jump', higher: true },
  { key: 'sprint_10m', higher: false },
  { key: 'sprint_30m', higher: false },
  { key: 'run_500m', higher: false },
];

function normalise(val: number, higher: boolean, min: number, max: number) {
  if (max === min) return 50;
  const n = (val - min) / (max - min);
  return higher ? n * 100 : (1 - n) * 100;
}

function computeGroups(students: Row[], results: Row[], numGroups: number): Record<string, number> {
  const scored = students.map(s => {
    const r = results.find(r => r.student_id === s.id) || {};
    const tests = s.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
    const vals: Record<string, number> = {};
    tests.forEach(t => {
      const v = parseFloat(r[t.key]);
      if (!isNaN(v)) vals[t.key] = v;
    });
    return { id: s.id, vals };
  });

  // Compute composite normalised score
  const withScore = scored.map(s => {
    const tests = students.find(st => st.id === s.id)?.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
    let total = 0, count = 0;
    tests.forEach(t => {
      const allVals = scored.map(x => x.vals[t.key]).filter(v => v !== undefined) as number[];
      if (allVals.length < 2 || s.vals[t.key] === undefined) return;
      const min = Math.min(...allVals), max = Math.max(...allVals);
      total += normalise(s.vals[t.key], t.higher, min, max);
      count++;
    });
    return { id: s.id, score: count > 0 ? total / count : null };
  });

  const tested = withScore.filter(s => s.score !== null).sort((a, b) => (b.score || 0) - (a.score || 0));
  const groupSize = Math.ceil(tested.length / numGroups);
  const groups: Record<string, number> = {};
  tested.forEach((s, i) => { groups[s.id] = Math.min(Math.floor(i / groupSize) + 1, numGroups); });
  return groups;
}

const GROUP_STYLES = [
  '',
  'bg-sky-500/15 border-sky-500/30 text-sky-300',
  'bg-violet-500/15 border-violet-500/30 text-violet-300',
  'bg-amber-500/15 border-amber-500/30 text-amber-300',
  'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
];
const GROUP_DOT = ['', 'bg-sky-400', 'bg-violet-400', 'bg-amber-400', 'bg-emerald-400'];

export default function HPClassesPage() {
  const { showToast } = useToast();
  const [students, setStudents] = React.useState<Row[]>([]);
  const [testResults, setTestResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  const [numGroups, setNumGroups] = React.useState(3);
  const [showGroups, setShowGroups] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const [sRes, tRes] = await Promise.all([
        supabase.from('hp_students').select('*').eq('is_active', true).order('grade').order('full_name'),
        supabase.from('hp_test_results').select('*').eq('year', 2026).order('test_date', { ascending: false }),
      ]);
      setStudents(sRes.data || []);
      setTestResults(tRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const classStudents = React.useMemo(() => {
    if (!selectedClass) return [];
    const grade = selectedClass.startsWith('8') ? 'Grade 8' : 'Grade 9';
    const cls = selectedClass.slice(1);
    return students.filter(s => s.grade === grade && s.class_group === cls);
  }, [selectedClass, students]);

  // Latest result per student
  const latestResults = React.useMemo(() => {
    const seen = new Set<string>();
    return testResults.filter(r => {
      if (seen.has(r.student_id)) return false;
      seen.add(r.student_id);
      return true;
    });
  }, [testResults]);

  const computedGroups = React.useMemo(() => {
    if (!showGroups || classStudents.length === 0) return {};
    return computeGroups(classStudents, latestResults, numGroups);
  }, [showGroups, classStudents, latestResults, numGroups]);

  async function saveGroups() {
    setSaving(true);
    const updates = Object.entries(computedGroups).map(([id, group]) =>
      supabase.from('hp_students').update({ training_group: group }).eq('id', id)
    );
    await Promise.all(updates);
    // Update local state
    setStudents(prev => prev.map(s => ({
      ...s,
      training_group: computedGroups[s.id] ?? s.training_group,
    })));
    showToast(`${numGroups} groups saved`);
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
          <h1 className="mt-1 text-3xl font-black text-white">Classes</h1>
        </div>

        {/* Grade 8 grid */}
        <div className="mb-8">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-sky-400">Grade 8</p>
          <div className="grid grid-cols-5 gap-3">
            {HP_CLASSES.map(c => {
              const key = `8${c}`;
              const cs = students.filter(s => s.class_group === c && s.grade === 'Grade 8');
              return (
                <button key={key} onClick={() => setSelectedClass(selectedClass === key ? null : key)}
                  className={`rounded-2xl border p-4 text-center transition hover:scale-[1.03] ${selectedClass === key ? 'border-sky-500/50 bg-sky-500/15' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                  <p className={`text-3xl font-black mb-1 ${selectedClass === key ? 'text-sky-400' : 'text-white'}`}>{c}</p>
                  <p className="text-[10px] text-slate-500">{cs.length}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade 9 grid */}
        <div className="mb-8">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-violet-400">Grade 9</p>
          <div className="grid grid-cols-5 gap-3">
            {HP_CLASSES.map(c => {
              const key = `9${c}`;
              const cs = students.filter(s => s.class_group === c && s.grade === 'Grade 9');
              return (
                <button key={key} onClick={() => setSelectedClass(selectedClass === key ? null : key)}
                  className={`rounded-2xl border p-4 text-center transition hover:scale-[1.03] ${selectedClass === key ? 'border-violet-500/50 bg-violet-500/15' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                  <p className={`text-3xl font-black mb-1 ${selectedClass === key ? 'text-violet-400' : 'text-white'}`}>{c}</p>
                  <p className="text-[10px] text-slate-500">{cs.length}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected class */}
        {selectedClass && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            {/* Header with group controls */}
            <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-black text-white">
                  {selectedClass.startsWith('8') ? 'Grade 8' : 'Grade 9'} Class {selectedClass.slice(1)}
                  <span className="ml-2 text-sm font-normal text-slate-500">({classStudents.length} students)</span>
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[3,4].map(n => (
                  <button key={n} onClick={() => setNumGroups(n)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${numGroups === n ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
                    {n} Groups
                  </button>
                ))}
                <button onClick={() => setShowGroups(g => !g)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${showGroups ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
                  {showGroups ? '● Groups On' : '○ Groups Off'}
                </button>
                {showGroups && (
                  <button onClick={saveGroups} disabled={saving}
                    className="rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300 hover:bg-sky-500/25 transition disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Groups'}
                  </button>
                )}
              </div>
            </div>

            {/* Group legend */}
            {showGroups && (
              <div className="mb-4 flex gap-2 flex-wrap">
                {Array.from({ length: numGroups }, (_, i) => i + 1).map(g => (
                  <div key={g} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${GROUP_STYLES[g]}`}>
                    <div className={`h-2 w-2 rounded-full ${GROUP_DOT[g]}`} />
                    Group {g}
                  </div>
                ))}
              </div>
            )}

            {/* Student list */}
            <div className="grid gap-1.5 sm:grid-cols-2">
              {classStudents.map(s => {
                const group = showGroups ? (computedGroups[s.id] ?? s.training_group) : s.training_group;
                const hasResult = latestResults.some(r => r.student_id === s.id);
                return (
                  <Link key={s.id} href={`/hp/students/${s.id}`}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition hover:scale-[1.01] ${
                      group && showGroups ? GROUP_STYLES[group] : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}>
                    <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                      group ? '' : 'bg-emerald-500/15 text-emerald-300'
                    } ${group === 1 ? 'bg-sky-500/20 text-sky-300' : group === 2 ? 'bg-violet-500/20 text-violet-300' : group === 3 ? 'bg-amber-500/20 text-amber-300' : group === 4 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                      {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                      {group && <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 ${GROUP_DOT[group]}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{s.full_name}</p>
                      {!hasResult && <p className="text-[9px] text-amber-500">No results yet</p>}
                    </div>
                    {group && (
                      <span className="shrink-0 text-[10px] font-black opacity-60">G{group}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-slate-500">Loading...</p>}
      </div>
    </main>
  );
}
