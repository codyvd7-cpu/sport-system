'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];

const ALL_TESTS = [
  { key: 'sprint_10m', label: '10m Sprint', unit: 's' },
  { key: 'sprint_30m', label: '30m Sprint', unit: 's' },
  { key: 'agility_505_left', label: '505 Left', unit: 's' },
  { key: 'agility_505_right', label: '505 Right', unit: 's' },
  { key: 'cmj', label: 'CMJ', unit: 'cm' },
  { key: 'yoyo_ir1', label: 'Yo-Yo IR1', unit: 'm' },
  { key: 'rsa_best', label: 'RSA Best', unit: 's' },
  { key: 'rsa_mean', label: 'RSA Mean', unit: 's' },
  { key: 'rsa_decrement', label: 'RSA Dec%', unit: '%' },
];

export default function HPTestingPage() {
  const { showToast } = useToast();
  const [step, setStep] = React.useState(1);
  const [students, setStudents] = React.useState<Row[]>([]);
  const [term, setTerm] = React.useState('Term 1');
  const [year, setYear] = React.useState(2026);
  const [testDate, setTestDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  const [selectedTests, setSelectedTests] = React.useState<string[]>(['sprint_10m','sprint_30m','cmj']);
  const [results, setResults] = React.useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});
  const [saved, setSaved] = React.useState<Record<string, boolean>>({});
  const [activeStudent, setActiveStudent] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      const { data } = await supabase.from('hp_students').select('*').eq('is_active', true).order('grade').order('full_name');
      setStudents(data || []);
    }
    load();
  }, []);

  React.useEffect(() => {
    async function loadExisting() {
      if (students.length === 0) return;
      const { data } = await supabase.from('hp_test_results').select('*').eq('term', term).eq('year', year);
      const pre: typeof results = {};
      const preSaved: typeof saved = {};
      (data || []).forEach(r => {
        pre[r.student_id] = {};
        ALL_TESTS.forEach(t => { if (r[t.key] !== null && r[t.key] !== undefined) pre[r.student_id][t.key] = String(r[t.key]); });
        preSaved[r.student_id] = true;
      });
      setResults(pre);
      setSaved(preSaved);
    }
    loadExisting();
  }, [term, year, students]);

  const classStudents = React.useMemo(() => {
    if (!selectedClass) return students;
    const grade = selectedClass.startsWith('8') ? 'Grade 8' : 'Grade 9';
    const cls = selectedClass.slice(1);
    return students.filter(s => s.grade === grade && s.class_group === cls);
  }, [selectedClass, students]);
  const activeFTests = ALL_TESTS.filter(t => selectedTests.includes(t.key));
  const completed = classStudents.filter(s => saved[s.id]).length;

  function toggleTest(key: string) {
    setSelectedTests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  async function saveStudentResults(studentId: string) {
    const vals = results[studentId] || {};
    setSaving(p => ({...p, [studentId]: true}));
    const payload: Row = { student_id: studentId, term, year, test_date: testDate };
    ALL_TESTS.forEach(t => { payload[t.key] = vals[t.key] ? parseFloat(vals[t.key]) : null; });
    await supabase.from('hp_test_results').delete().eq('student_id', studentId).eq('term', term).eq('year', year);
    await supabase.from('hp_test_results').insert([payload]);
    setSaved(p => ({...p, [studentId]: true}));
    setSaving(p => ({...p, [studentId]: false}));
    setActiveStudent(null);
    showToast('Results saved');
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← High Performance</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-400">High Performance</p>
          <h1 className="mt-1 text-3xl font-black text-white">Testing</h1>
        </div>

        {/* Step 1: Setup */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-500">Step 1 — Session Setup</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={term} onChange={e => setTerm(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              {['Term 1','Term 2','Term 3'].map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
          </div>

          {/* Class selector */}
          <div className="mt-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Select Class</p>
            <button onClick={() => setSelectedClass(null)}
              className={`w-full rounded-xl border py-2.5 text-sm font-black transition ${!selectedClass ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
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

        {/* Step 2: Select tests */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-500">Step 2 — Select Tests</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_TESTS.map(t => (
              <button key={t.key} onClick={() => toggleTest(t.key)}
                className={`rounded-xl border px-3 py-2 text-left transition ${selectedTests.includes(t.key) ? 'border-violet-500/40 bg-violet-500/15' : 'border-slate-700 bg-slate-800'}`}>
                <p className={`text-xs font-black ${selectedTests.includes(t.key) ? 'text-violet-300' : 'text-slate-400'}`}>{t.label}</p>
                <p className="text-[10px] text-slate-600">{t.unit}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Enter results */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Step 3 — Enter Results</p>
            <span className="text-xs text-slate-500">{completed}/{classStudents.length} complete</span>
          </div>

          {/* Progress bar */}
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${classStudents.length > 0 ? (completed/classStudents.length)*100 : 0}%` }} />
          </div>

          <div className="space-y-2">
            {classStudents.map(s => {
              const isOpen = activeStudent === s.id;
              const isDone = saved[s.id];
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
                    {isDone
                      ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">Saved ✓</span>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-4 w-4 text-slate-500 transition ${isOpen ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6"/></svg>
                    }
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {activeFTests.map(t => (
                          <div key={t.key}>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">{t.label} ({t.unit})</label>
                            <input type="number" step="any" inputMode="decimal"
                              value={results[s.id]?.[t.key] || ''}
                              onChange={e => setResults(p => ({...p, [s.id]: {...(p[s.id]||{}), [t.key]: e.target.value}}))}
                              placeholder="—"
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
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
            {classStudents.length === 0 && <p className="text-sm text-slate-500">No students. Add students first.</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
