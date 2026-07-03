'use client';
import * as React from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';

type Row = Record<string, any>;

const CLASS_OPTIONS = ['8B','8E','8F','8J','8M','9B','9E','9F','9J','9M'];
const GRADE8_TESTS = [
  { key: 'chin_up_hang', higher: true },{ key: 'broad_jump', higher: true },
  { key: 'sprint_10m', higher: false },{ key: 'sprint_30m', higher: false },{ key: 'run_500m', higher: false },
];
const GRADE9_TESTS = [
  { key: 'pushup_2min', higher: true },{ key: 'triple_broad_jump', higher: true },
  { key: 'sprint_10m', higher: false },{ key: 'sprint_30m', higher: false },{ key: 'run_500m', higher: false },
];

function normalise(val: number, higher: boolean, min: number, max: number) {
  if (max === min) return 50;
  const n = (val - min) / (max - min);
  return higher ? n * 100 : (1 - n) * 100;
}

function computeGroups(students: Row[], results: Record<string, Row>, numGroups: number): Record<string, number> {
  const tests = students[0]?.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
  const scored = students.map(s => {
    const r = results[s.id] || {};
    const vals: Record<string, number> = {};
    tests.forEach(t => { const v = parseFloat(r[t.key]); if (!isNaN(v)) vals[t.key] = v; });
    return { id: s.id, vals };
  });
  const withScore = scored.map(s => {
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

const GROUP_COLORS: Record<number, string> = {
  1: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  2: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  3: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  4: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  5: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

export default function HPClassesPage() {
  const { showToast } = useToast();
  const [students, setStudents] = React.useState<Row[]>([]);
  const [latestResults, setLatestResults] = React.useState<Record<string, Row>>({});
  const [loading, setLoading] = React.useState(true);
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  const [numGroups, setNumGroups] = React.useState(3);
  const [saving, setSaving] = React.useState(false);

  async function load() {
    const year = new Date().getFullYear();
    const res = await fetch(`/api/hp/data?type=trends`, { credentials: 'include' });
    if (!res.ok) { setLoading(false); return; }
    const d = await res.json();
    const sorted = (d.students || []).sort((a: Row, b: Row) => {
      const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
      const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
      return sA.localeCompare(sB);
    });
    setStudents(sorted);
    const latMap: Record<string, Row> = {};
    (d.tests || []).filter((r: Row) => r.year === year).forEach((r: Row) => { latMap[r.student_id] = r; });
    setLatestResults(latMap);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  const classStudents = React.useMemo(() => {
    if (!selectedClass) return [];
    const grade = selectedClass[0] === '8' ? 'Grade 8' : 'Grade 9';
    const cls = selectedClass[1];
    return students.filter(s => s.grade === grade && s.class_group === cls);
  }, [selectedClass, students]);

  const computedGroups = React.useMemo(() => {
    if (!selectedClass || classStudents.length === 0) return {};
    return computeGroups(classStudents, latestResults, numGroups);
  }, [classStudents, latestResults, numGroups, selectedClass]);

  async function saveGroups() {
    setSaving(true);
    await Promise.all(Object.entries(computedGroups).map(([id, group]) =>
      fetch('/api/hp/data', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', table: 'hp_students', data: { training_group: group }, matchCol: 'id', matchVal: id }),
      })
    ));
    setStudents(prev => prev.map(s => ({ ...s, training_group: computedGroups[s.id] ?? s.training_group })));
    showToast(`${numGroups} groups saved ✓`);
    setSaving(false);
  }

  const grade8Classes = CLASS_OPTIONS.filter(c => c[0] === '8');
  const grade9Classes = CLASS_OPTIONS.filter(c => c[0] === '9');

  return (
    <main className="min-h-screen pt-[54px] text-white lg:pt-0 lg:pb-10" style={{background:'#060c1a'}}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
          <h1 className="mt-1 text-3xl font-black text-white">Classes</h1>
          <p className="mt-1 text-sm text-white/35">Select a class to view roster and manage training groups</p>
        </div>

        {/* Class selector */}
        <div className="mb-8 space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Grade 8</p>
            <div className="flex flex-wrap gap-2">
              {grade8Classes.map(c => {
                const cs = students.filter(s => s.grade === 'Grade 8' && s.class_group === c[1]);
                const tested = cs.filter(s => latestResults[s.id]).length;
                return (
                  <button key={c} onClick={() => setSelectedClass(selectedClass === c ? null : c)}
                    className={`rounded-2xl border px-5 py-3 text-left transition hover:scale-[1.03] ${selectedClass === c ? 'border-sky-500/50 bg-sky-500/15' : 'border-white/6 bg-[rgba(255,255,255,0.025)] hover:border-white/8'}`}>
                    <p className={`text-2xl font-black ${selectedClass === c ? 'text-sky-400' : 'text-white'}`}>{c}</p>
                    <p className="text-[10px] text-white/35 mt-0.5">{cs.length} students</p>
                    <p className="text-[10px] text-white/25">{tested} tested</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-violet-400">Grade 9</p>
            <div className="flex flex-wrap gap-2">
              {grade9Classes.map(c => {
                const cs = students.filter(s => s.grade === 'Grade 9' && s.class_group === c[1]);
                const tested = cs.filter(s => latestResults[s.id]).length;
                return (
                  <button key={c} onClick={() => setSelectedClass(selectedClass === c ? null : c)}
                    className={`rounded-2xl border px-5 py-3 text-left transition hover:scale-[1.03] ${selectedClass === c ? 'border-violet-500/50 bg-violet-500/15' : 'border-white/6 bg-[rgba(255,255,255,0.025)] hover:border-white/8'}`}>
                    <p className={`text-2xl font-black ${selectedClass === c ? 'text-violet-400' : 'text-white'}`}>{c}</p>
                    <p className="text-[10px] text-white/35 mt-0.5">{cs.length} students</p>
                    <p className="text-[10px] text-white/25">{tested} tested</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Class detail */}
        {selectedClass && (
          <div className="rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)] overflow-hidden">
            {/* Class header */}
            <div className="border-b border-white/6 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-lg font-black text-white">{selectedClass[0] === '8' ? 'Grade 8' : 'Grade 9'} — Class {selectedClass[1]}</p>
                <p className="text-xs text-white/35">{classStudents.length} students · {classStudents.filter(s => latestResults[s.id]).length} with results</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Link href={`/hp/attendance?class=${selectedClass}`}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 transition">
                  Take Register
                </Link>
                <Link href={`/hp/testing?class=${selectedClass}`}
                  className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-black text-violet-300 hover:bg-violet-500/20 transition">
                  Enter Tests
                </Link>
              </div>
            </div>

            {/* Group controls */}
            <div className="border-b border-white/6 px-5 py-3 flex items-center gap-3 flex-wrap bg-[rgba(255,255,255,0.025)]/50">
              <p className="text-xs font-black text-white/35">Training Groups:</p>
              {[2,3,4,5].map(n => (
                <button key={n} onClick={() => setNumGroups(n)}
                  className={`h-7 w-7 rounded-lg text-xs font-black transition ${numGroups === n ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'border border-white/8 bg-white/5 text-white/35 hover:text-white'}`}>
                  {n}
                </button>
              ))}
              <button onClick={saveGroups} disabled={saving || Object.keys(computedGroups).length === 0}
                className="ml-auto rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-black text-violet-300 hover:bg-violet-500/25 transition disabled:opacity-40">
                {saving ? 'Saving...' : 'Save Groups'}
              </button>
            </div>

            {/* Group preview strips */}
            <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-white/6">
              {Array.from({ length: numGroups }, (_, i) => i + 1).map(g => {
                const members = classStudents.filter(s => (computedGroups[s.id] ?? s.training_group) === g);
                return (
                  <div key={g} className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[10px] font-black ${GROUP_COLORS[g] || ''}`}>
                    <span>G{g}</span>
                    {members.length > 0 && <span className="opacity-60">· {members.length}</span>}
                  </div>
                );
              })}
              {classStudents.filter(s => !computedGroups[s.id] && !s.training_group).length > 0 && (
                <span className="text-[10px] text-white/25 self-center">{classStudents.filter(s => !computedGroups[s.id] && !s.training_group).length} ungrouped</span>
              )}
            </div>

            {/* Student roster */}
            {loading ? (
              <div className="p-5 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : (
              <div className="divide-y divide-white/5/60">
                {classStudents.map(s => {
                  const group = computedGroups[s.id] ?? s.training_group;
                  const hasTested = !!latestResults[s.id];
                  return (
                    <Link key={s.id} href={`/hp/students/${s.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-white/5/40 transition">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black border ${group ? GROUP_COLORS[group] : 'border-white/8 bg-white/5 text-white/50'}`}>
                        {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{s.full_name}</p>
                      </div>
                      {group && (
                        <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-black ${GROUP_COLORS[group]}`}>
                          Group {group}
                        </span>
                      )}
                      {!hasTested && (
                        <span className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-400">
                          Untested
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
