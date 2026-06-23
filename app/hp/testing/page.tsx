'use client';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { PageLoader } from '@/components/HPIcons';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';
import { getCalendarTerm, getCurrentYear, HP_TERMS, getTermDateRange, prevTerm, nextTerm, termFromParam, yearFromParam, getLatestTermWithData } from '@/lib/hpTerm';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];

const GRADE8_TESTS = [
  { key: 'chin_up_hang', label: 'Chin Up Hang', unit: 'mm:ss', higher: true },
  { key: 'broad_jump', label: 'Broad Jump', unit: 'cm', higher: true },
  { key: 'sprint_10m', label: '10m Sprint', unit: 's', higher: false },
  { key: 'sprint_30m', label: '30m Sprint', unit: 's', higher: false },
  { key: 'run_500m', label: '500m Run', unit: 'mm:ss', higher: false },
];

const GRADE9_TESTS = [
  { key: 'pushup_reps',       label: 'Push Up Reps',   unit: 'reps', higher: true,  inputType: 'number' },
  { key: 'pushup_hold',       label: 'Push Up Hold',   unit: 'mm:ss', higher: true,  inputType: 'text' },
  { key: 'triple_broad_jump', label: 'Triple Broad Jump', unit: 'cm', higher: true, inputType: 'number' },
  { key: 'sprint_10m',        label: '10m Sprint',     unit: 's',    higher: false, inputType: 'number' },
  { key: 'sprint_30m',        label: '30m Sprint',     unit: 's',    higher: false, inputType: 'number' },
  { key: 'run_500m',          label: '500m Run',       unit: 'mm:ss',higher: false, inputType: 'text'   },
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
      const val = (t.key === 'run_500m' || t.key === 'pushup_hold') ? mmssToSeconds(r[t.key] || '') : parseFloat(r[t.key] || '');
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
        return (t.key === 'run_500m' || t.key === 'pushup_hold') ? mmssToSeconds(rv[t.key] || '') : parseFloat(rv[t.key] || '');
      }).filter(v => v !== null && !isNaN(v as number)) as number[];
      if (allVals.length < 2) return;
      const min = Math.min(...allVals), max = Math.max(...allVals);
      const val = (t.key === 'run_500m' || t.key === 'pushup_hold') ? mmssToSeconds(r[t.key] || '') : parseFloat(r[t.key] || '');
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
  return (
    <React.Suspense fallback={<PageLoader label="Loading tests"/>}>
      <HPTestingInner/>
    </React.Suspense>
  );
}

function HPTestingInner() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const urlClass = searchParams.get('class');
  const [students, setStudents] = React.useState<Row[]>([]);
  const [term, setTerm] = React.useState<string>(() => getCalendarTerm());
  const [year, setYear] = React.useState(() => getCurrentYear());
  const [testDate, setTestDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = React.useState<string | null>(urlClass || null);
  const [results, setResults] = React.useState<Record<string, Row>>({});
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});
  const [saved, setSaved] = React.useState<Record<string, boolean>>({});
  const [prevResults, setPrevResults] = React.useState<Record<string, Row>>({});
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activeStudent, setActiveStudent] = React.useState<string | null>(null);
  const [numGroups, setNumGroups] = React.useState(3);

  React.useEffect(() => {
    fetch('/api/hp/data?type=students', { credentials: 'include' })
      .then(r => r.json()).then(d => {
        const sorted = (d.data || []).sort((a: Row, b: Row) => {
          const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          if (sA !== sB) return sA.localeCompare(sB);
          return a.grade.localeCompare(b.grade);
        });
        setStudents(sorted);
      });
  }, []);

  React.useEffect(() => {
    if (students.length === 0) return;
    setLoadError(null);
    const prevTermName = prevTerm(term as any);

    fetch(`/api/hp/data?type=testing&term=${encodeURIComponent(term)}&year=${year}`, { credentials: 'include' })
      .then(r => r.json()).then(d => {
        const pre: Record<string, Row> = {};
        const preSaved: Record<string, boolean> = {};
        (d.tests || []).forEach((r: Row) => {
          pre[r.student_id] = r;
          if (r.run_500m) pre[r.student_id].run_500m = secondsToMmss(r.run_500m);
          if (r.chin_up_hang) pre[r.student_id].chin_up_hang = secondsToMmss(r.chin_up_hang);
          preSaved[r.student_id] = true;
        });
        setResults(pre);
        setSaved(preSaved);
      }).catch(e => setLoadError(`Could not load results: ${e.message}`));

    if (prevTermName) {
      fetch(`/api/hp/data?type=testing&term=${encodeURIComponent(prevTermName)}&year=${year}`, { credentials: 'include' })
        .then(r => r.json()).then(d => {
          const prevPre: Record<string, Row> = {};
          (d.tests || []).forEach((r: Row) => { prevPre[r.student_id] = r; });
          setPrevResults(prevPre);
        });
    } else {
      setPrevResults({});
    }
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
      if (t.key === 'run_500m' || t.key === 'chin_up_hang' || t.key === 'pushup_hold') {
        payload[t.key] = mmssToSeconds(vals[t.key] || '');
      } else {
        payload[t.key] = vals[t.key] ? parseFloat(vals[t.key]) : null;
      }
    });
    const res = await fetch('/api/hp/data', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_test_result', student_id: studentId, term, year, ...payload }),
    });
    if (!res.ok) { const d = await res.json(); showToast(`Save error: ${d.error}`); setSaving(p => ({ ...p, [studentId]: false })); return; }
    setSaved(p => ({ ...p, [studentId]: true }));
    setSaving(p => ({ ...p, [studentId]: false }));
    setActiveStudent(null);
    showToast('Results saved ✓');
  }

  async function saveGroups() {
    const res = await fetch(`/api/hp/data?type=testing&year=${year}`, { credentials: 'include' });
    const d = await res.json();
    const latestMap: Record<string, Row> = {};
    (d.tests || []).forEach((r: Row) => {
      const converted = { ...r };
      if (converted.run_500m) converted.run_500m = secondsToMmss(converted.run_500m);
      latestMap[r.student_id] = converted;
    });
    const grouped = assignGroups(classStudents, latestMap, numGroups, tests);
    await Promise.all(grouped.filter(s => s._group !== null).map(s =>
      fetch('/api/hp/data', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', table: 'hp_students', data: { training_group: s._group }, matchCol: 'id', matchVal: s.id }),
      })
    ));
    setStudents(prev => prev.map(s => {
      const g = grouped.find(gs => gs.id === s.id);
      return g ? { ...s, training_group: g._group } : s;
    }));
    showToast(`Groups saved — ${numGroups} groups assigned from latest results`);
  }

  return (
<FadeUp delay={0}>
    <main className="min-h-screen pt-14 pb-20 text-white lg:pt-0 lg:pb-10" style={{background:'#060c1a'}}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-white/35 hover:text-white/70">← High Performance</Link>
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em]" style={{color:"rgba(167,139,250,0.7)"}}>High Performance</p>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">Testing</h1>
        </div>

        {/* Step 1 */}
        <div className="mb-5 rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-white/35">Step 1 — Session Setup</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={term} onChange={e => setTerm(e.target.value)} className="rounded-xl border border-white/8 bg-[#0d1424] [&>option]:bg-[#0d1424] [&>option]:text-white px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              {HP_TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="rounded-xl border border-white/8 bg-[#0d1424] [&>option]:bg-[#0d1424] [&>option]:text-white px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} className="rounded-xl border border-white/8 bg-[#0d1424] [&>option]:bg-[#0d1424] [&>option]:text-white px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
          </div>

          {/* Class selector */}
          <div className="mt-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/35">Select Class</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setSelectedClass(null)} className={`rounded-xl border py-2.5 text-sm font-black transition ${!selectedClass ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-white/8 bg-white/5 text-white/50 hover:text-white'}`}>All</button>
              <button onClick={() => setSelectedClass('Grade 8')} className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === 'Grade 8' ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-white/8 bg-white/5 text-white/50 hover:text-white'}`}>Grade 8</button>
              <button onClick={() => setSelectedClass('Grade 9')} className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === 'Grade 9' ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-white/8 bg-white/5 text-white/50 hover:text-white'}`}>Grade 9</button>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Grade 8</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => { const key = `8${c}`; return (
                  <button key={key} onClick={() => setSelectedClass(key)} className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === key ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-white/8 bg-white/5 text-white/50 hover:text-white'}`}>{c}</button>
                );})}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-violet-400">Grade 9</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => { const key = `9${c}`; return (
                  <button key={key} onClick={() => setSelectedClass(key)} className={`rounded-xl border py-2.5 text-sm font-black transition ${selectedClass === key ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-white/8 bg-white/5 text-white/50 hover:text-white'}`}>{c}</button>
                );})}
              </div>
            </div>
          </div>

          {grade && !mixedGrades && (
            <div className="mt-3 rounded-xl border border-white/8 bg-white/5/50 px-4 py-2.5">
              <p className="text-xs text-white/50">
                <span className="font-black text-white">{grade} tests:</span>{' '}
                {tests.map(t => `${t.label} (${t.unit})`).join(' · ')}
              </p>
            </div>
          )}
        </div>



        {/* Load error banner */}
        {loadError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {loadError}
          </div>
        )}

        {/* Step 2: Enter results */}
        <div className="rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-white/35">Step 2 — Enter Results</p>
            <span className="text-xs text-white/35">{completed}/{classStudents.length} complete</span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${classStudents.length > 0 ? (completed/classStudents.length)*100 : 0}%` }} />
          </div>
        <div className="space-y-2">
            {classStudents.map(s => {
              const isOpen = activeStudent === s.id;
              const isDone = saved[s.id];
              const studentTests = s.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
              const prevTermName = prevTerm(term as any);
              return (
                <div key={s.id} className={`rounded-2xl border transition ${isDone ? 'border-emerald-500/20 bg-emerald-500/5' : isOpen ? 'border-violet-500/30 bg-violet-500/5' : 'border-white/6 bg-[rgba(255,255,255,0.025)]/50'}`}>
                  <button onClick={() => setActiveStudent(isOpen ? null : s.id)} className="flex w-full items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-black text-white/70">
                      {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white">{s.full_name}</p>
                      <p className="text-[10px] text-white/35">{s.grade}{s.class_group ? ` · Class ${s.class_group}` : ''}</p>
                    </div>
                    {isDone && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">Saved ✓</span>}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-4 w-4 text-white/35 transition ${isOpen ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/6 px-4 pb-4 pt-3">
                      {/* Previous term reference */}
                      {prevTermName && prevResults[s.id] && (
                        <div className="mb-3 rounded-xl border border-white/8 bg-white/5/50 px-3 py-2">
                          <p className="mb-1.5 text-[9px] font-black uppercase tracking-wide text-white/35">{prevTermName} Reference</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {studentTests.map(t => {
                              const prev = prevResults[s.id];
                              const raw = t.key === 'run_500m' ? prev[t.key] : parseFloat(prev[t.key]);
                              const display = t.key === 'run_500m' && raw ? secondsToMmss(raw as number) : (isNaN(raw as number) ? null : raw);
                              return display != null ? (
                                <span key={t.key} className="text-[10px]">
                                  <span className="text-white/25">{t.label}: </span>
                                  <span className="font-black text-white/70">{display}{t.unit !== 'mm:ss' ? t.unit : ''}</span>
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {studentTests.map(t => (
                          <div key={t.key}>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-white/35">{t.label} ({t.unit})</label>
                            <input
                              type={t.unit === 'mm:ss' ? 'text' : 'number'}
                              step="any"
                              inputMode={t.unit === 'mm:ss' ? 'text' : 'decimal'}
                              value={results[s.id]?.[t.key] || ''}
                              onChange={e => setResults(p => ({ ...p, [s.id]: { ...(p[s.id] || {}), [t.key]: e.target.value } }))}
                              placeholder={t.unit === 'mm:ss' ? '2:05' : t.unit === 's' ? '0.00' : '—'}
                              className="w-full rounded-xl border border-white/8 bg-[#0d1424] [&>option]:bg-[#0d1424] [&>option]:text-white px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
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

        {/* Step 3: Assign Training Groups */}
        {classStudents.length > 0 && !mixedGrades && (
          <div className="mt-5 rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
            <p className="mb-1 text-xs font-black uppercase tracking-wide text-white/35">Step 3 — Assign Training Groups</p>
            <p className="mb-4 text-[11px] text-white/25">Ranked from <span className="text-white font-black">latest available results</span> per student — Term 2 if done, Term 1 fallback. Students without results are left ungrouped.</p>
            <div className="mb-4 flex items-center gap-3">
              <p className="text-xs font-black text-white/50">Number of Groups</p>
              <div className="flex gap-1.5">
                {[2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setNumGroups(n)}
                    className={`h-8 w-8 rounded-xl text-sm font-black transition ${numGroups === n ? 'border border-violet-500/40 bg-violet-500/20 text-violet-300' : 'border border-white/8 bg-white/5 text-white/50 hover:text-white'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              const preview = assignGroups(classStudents, results, numGroups, tests);
              const ungrouped = preview.filter(s => s._group === null);
              const groupColors = [
                'border-sky-500/20 bg-sky-500/5 text-sky-300',
                'border-violet-500/20 bg-violet-500/5 text-violet-300',
                'border-amber-500/20 bg-amber-500/5 text-amber-300',
                'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
                'border-rose-500/20 bg-rose-500/5 text-rose-300',
              ];
              return (
                <div className="mb-4 space-y-2">
                  {Array.from({ length: numGroups }, (_, i) => i + 1).map(g => {
                    const members = preview.filter(s => s._group === g);
                    if (!members.length) return null;
                    return (
                      <div key={g} className={`rounded-xl border p-3 ${groupColors[g - 1]}`}>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wide">Group {g} · {members.length} students</p>
                        <div className="flex flex-wrap gap-1.5">
                          {members.map(s => (
                            <span key={s.id} className="rounded-lg bg-black/20 px-2 py-0.5 text-[10px] font-semibold">
                              {s.full_name.trim().split(' ').pop()}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {ungrouped.length > 0 && (
                    <p className="text-[11px] text-white/25">{ungrouped.length} student{ungrouped.length > 1 ? 's' : ''} not yet tested — will not be assigned</p>
                  )}
                </div>
              );
            })()}
            <button onClick={saveGroups}
              className="w-full rounded-xl border border-violet-500 bg-violet-500/15 py-2.5 text-sm font-black text-violet-300 hover:bg-violet-500/25 transition">
              Save Groups to Students
            </button>
          </div>
        )}
      </div>
    </main>
    </FadeUp>
  );
}