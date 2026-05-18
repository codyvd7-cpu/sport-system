'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];

const GRADE8_TESTS = [
  { key: 'chin_up_hang', label: 'Chin Up Hang', unit: 's', higher: true },
  { key: 'broad_jump', label: 'Broad Jump', unit: 'cm', higher: true },
  { key: 'sprint_10m', label: '10m Sprint', unit: 's', higher: false },
  { key: 'sprint_30m', label: '30m Sprint', unit: 's', higher: false },
  { key: 'run_500m', label: '500m Run', unit: 'mm:ss', higher: false },
];

const GRADE9_TESTS = [
  { key: 'pushup_2min', label: '2 Min Push Up', unit: 'reps', higher: true },
  { key: 'triple_broad_jump', label: 'Triple Broad Jump', unit: 'cm', higher: true },
  { key: 'sprint_10m', label: '10m Sprint', unit: 's', higher: false },
  { key: 'sprint_30m', label: '30m Sprint', unit: 's', higher: false },
  { key: 'run_500m', label: '500m Run', unit: 'mm:ss', higher: false },
];

function mmssToSeconds(val: string): number | null {
  if (!val) return null;
  if (val.includes(':')) {
    const [m, s] = val.split(':').map(Number);
    return m * 60 + s;
  }
  return parseFloat(val) || null;
}

function secondsToMmss(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function normaliseScore(val: number, higher: boolean, min: number, max: number): number {
  if (max === min) return 50;
  const norm = (val - min) / (max - min);
  return higher ? norm * 100 : (1 - norm) * 100;
}

function assignGroups(students: Row[], results: Record<string, Row>, numGroups: number, tests: typeof GRADE8_TESTS): Row[] {
  const scored = students.map(s => {
    const r = results[s.id] || {};
    const scores: number[] = [];
    tests.forEach(t => {
      const val = t.key === 'run_500m' ? mmssToSeconds(r[t.key] || '') : parseFloat(r[t.key] || '');
      if (val !== null && !isNaN(val)) scores.push(val);
    });
    return { ...s, _scores: scores, _avgScore: scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null } as Row;
  });

  // Compute normalised composite score per student
  const withScores = scored.map((s: Row) => {
    const r = results[s.id] || {};
    let total = 0, count = 0;
    tests.forEach(t => {
      const allVals = students.map(st => {
        const rv = results[st.id] || {};
        return t.key === 'run_500m' ? mmssToSeconds(rv[t.key] || '') : parseFloat(rv[t.key] || '');
      }).filter(v => v !== null && !isNaN(v as number)) as number[];
      if (allVals.length < 2) return;
      const min = Math.min(...allVals), max = Math.max(...allVals);
      const val = t.key === 'run_500m' ? mmssToSeconds(r[t.key] || '') : parseFloat(r[t.key] || '');
      if (val !== null && !isNaN(val)) {
        total += normaliseScore(val, t.higher, min, max);
        count++;
      }
    });
    return { ...s, _composite: count > 0 ? total / count : null };
  });

  // Sort by composite score descending (best = highest normalised score)
  const tested = withScores.filter(s => s._composite !== null).sort((a, b) => b._composite - a._composite);
  const untested = withScores.filter(s => s._composite === null);

  // Assign groups evenly
  const groupSize = Math.ceil(tested.length / numGroups);
  const result = tested.map((s, i) => ({ ...s, _group: Math.min(Math.floor(i / groupSize) + 1, numGroups) }));

  return [...result, ...untested.map(s => ({ ...s, _group: null }))];
}

export default function HPTestingPage() {
  const { showToast } = useToast();
  const [students, setStudents] = React.useState<Row[]>([]);
  const [term, setTerm] = React.useState('Term 2');
  const [year, setYear] = React.useState(2026);
  const [testDate, setTestDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Record<string, Row>>({});
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});
  const [saved, setSaved] = React.useState<Record<string, boolean>>({});
  const [activeStudent, setActiveStudent] = React.useState<string | null>(null);
  const [numGroups, setNumGroups] = React.useState(3);

  React.useEffect(() => {
    supabase.from('hp_students').select('*').eq('is_active', true)
      .then(({ data }) => {
        const sorted = (data || []).sort((a, b) => {
          const surnameA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          const surnameB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          if (surnameA !== surnameB) return surnameA.localeCompare(surnameB);
          return a.grade.localeCompare(b.grade);
        });
        setStudents(sorted);
      });
  }, []);

  React.useEffect(() => {
    if (students.length === 0) return;
    supabase.from('hp_test_results').select('*').eq('term', term).eq('year', year)
      .then(({ data }) => {
        const pre: typeof results = {};
        const preSaved: typeof saved = {};
        (data || []).forEach(r => {
          pre[r.student_id] = r;
          if (r.run_500m) pre[r.student_id].run_500m = secondsToMmss(r.run_500m);
          preSaved[r.student_id] = true;
        });
        setResults(pre);
        setSaved(preSaved);
      });
  }, [term, year, students]);

  const classStudents = React.useMemo(() => {
    if (!selectedClass) return students;
    if (selectedClass === 'Grade 8' || selectedClass === 'Grade 9') return students.filter(s => s.grade === selectedClass);
    const grade = selectedClass.startsWith('8') ? 'Grade 8' : 'Grade 9';
    const cls = selectedClass.slice(1);
    return students.filter(s => s.grade === grade && s.class_group === cls);
  }, [selectedClass, students]);

  // Determine which tests to show based on selected students' grades
  const grade = classStudents.length > 0 ? classStudents[0].grade : null;
  const tests = grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
  const mixedGrades = classStudents.some(s => s.grade !== classStudents[0]?.grade);

  const completed = classStudents.filter(s => saved[s.id]).length;


  async function saveStudentResults(studentId: string) {
    const vals = results[studentId] || {};
    setSaving(p => ({ ...p, [studentId]: true }));
    const student = students.find(s => s.id === studentId);
    const studentTests = student?.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
    const payload: Row = { student_id: studentId, term, year, test_date: testDate };
    studentTests.forEach(t => {
      if (t.key === 'run_500m') {
        payload[t.key] = mmssToSeconds(vals[t.key] || '');
      } else {
        payload[t.key] = vals[t.key] ? parseFloat(vals[t.key]) : null;
      }
    });
    const { error: delError } = await supabase.from('hp_test_results').delete().eq('student_id', studentId).eq('term', term).eq('year', year);
    if (delError) { showToast(`Delete error: ${delError.message}`); setSaving(p => ({ ...p, [studentId]: false })); return; }
    const { error: insError } = await supabase.from('hp_test_results').insert([payload]);
    if (insError) { showToast(`Save error: ${insError.message}`); setSaving(p => ({ ...p, [studentId]: false })); return; }
    setSaved(p => ({ ...p, [studentId]: true }));
    setSaving(p => ({ ...p, [studentId]: false }));
    setActiveStudent(null);
    showToast('Results saved ✓');
  }

  async function saveGroups() {
    const grouped = assignGroups(classStudents, results, numGroups, tests);
    const updates = grouped.filter(s => s._group !== null).map(s =>
      supabase.from('hp_students').update({ training_group: s._group }).eq('id', s.id)
    );
    await Promise.all(updates);
    setStudents(prev => prev.map(s => {
      const g = grouped.find(gs => gs.id === s.id);
      return g ? { ...s, training_group: g._group } : s;
    }));
    showToast(`Groups saved — ${numGroups} groups assigned`);
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-400">High Performance</p>
          <h1 className="mt-1 text-3xl font-black text-white">Testing</h1>
        </div>

        {/* Step 1 */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-500">Step 1 — Session Setup</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={term} onChange={e => setTerm(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              {['Term 1','Term 2','Term 3'].map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
          </div>

          {/* Class selector */}
          <div className="mt-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Select Class</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setSelectedClass(null)} className={`rounded-xl border py-2.5 text-sm font-black transition ${!selectedClass ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>All</button>
              <button onClick={() => setSelectedClass('Grade 8')} className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === 'Grade 8' ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>Grade 8</button>
              <button onClick={() => setSelectedClass('Grade 9')} className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === 'Grade 9' ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>Grade 9</button>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Grade 8</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => { const key = `8${c}`; return (
                  <button key={key} onClick={() => setSelectedClass(key)} className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === key ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>{c}</button>
                );})}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-violet-400">Grade 9</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => { const key = `9${c}`; return (
                  <button key={key} onClick={() => setSelectedClass(key)} className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === key ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>{c}</button>
                );})}
              </div>
            </div>
          </div>

          {grade && !mixedGrades && (
            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5">
              <p className="text-xs text-slate-400">
                <span className="font-black text-white">{grade} tests:</span>{' '}
                {tests.map(t => `${t.label} (${t.unit})`).join(' · ')}
              </p>
            </div>
          )}
        </div>



        {/* Step 2: Enter results */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Step 2 — Enter Results</p>
            <span className="text-xs text-slate-500">{completed}/{classStudents.length} complete</span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${classStudents.length > 0 ? (completed/classStudents.length)*100 : 0}%` }} />
          </div>

          <div className="space-y-2">
            {classStudents.map(s => {
              const isOpen = activeStudent === s.id;
              const isDone = saved[s.id];
              const studentTests = s.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
              return (
                <div key={s.id} className={`rounded-2xl border transition ${isDone ? 'border-emerald-500/20 bg-emerald-500/5' : isOpen ? 'border-violet-500/30 bg-violet-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
                  <button onClick={() => setActiveStudent(isOpen ? null : s.id)} className="flex w-full items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300">
                      {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white">{s.full_name}</p>
                      <p className="text-[10px] text-slate-500">{s.grade}{s.class_group ? ` · Class ${s.class_group}` : ''}</p>
                    </div>
                    {isDone && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">Saved ✓</span>}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-4 w-4 text-slate-500 transition ${isOpen ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {studentTests.map(t => (
                          <div key={t.key}>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">{t.label} ({t.unit})</label>
                            <input
                              type={t.unit === 'mm:ss' ? 'text' : 'number'}
                              step="any" inputMode="decimal"
                              value={results[s.id]?.[t.key] || ''}
                              onChange={e => setResults(p => ({ ...p, [s.id]: { ...(p[s.id] || {}), [t.key]: e.target.value } }))}
                              placeholder={t.unit === 'mm:ss' ? '2:05' : '—'}
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                            />
                          </div>
                        ))}
                      </div>
                      <button onClick={() => saveStudentResults(s.id)} disabled={saving[s.id]}
                        className="mt-4 w-full rounded-xl border border-violet-500 bg-violet-500/15 py-2.5 text-sm font-black text-violet-300 disabled:opacity-50 hover:bg-violet-500/25 transition">
                        {saving[s.id] ? 'Saving...' : 'Save Results'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}