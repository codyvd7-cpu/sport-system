'use client';

import * as React from 'react';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const TEAM_GROUPS = [
  { group: 'Senior', color: 'violet', teams: ['1sts', '2nds', '3rds', '4ths', '5ths'] },
  { group: 'U16', color: 'sky', teams: ['U16A', 'U16B', 'U16C', 'U16D', 'U16E'] },
  { group: 'U15', color: 'emerald', teams: ['U15A', 'U15B', 'U15C', 'U15D', 'U15E'] },
  { group: 'U14', color: 'amber', teams: ['U14A', 'U14B', 'U14C', 'U14D', 'U14E'] },
];
const ALL_TEAMS = TEAM_GROUPS.flatMap((g) => g.teams);

const TEST_LIBRARY = [
  { name: '10m Sprint', unit: 's', lower: true, desc: 'Acceleration' },
  { name: '30m Sprint', unit: 's', lower: true, desc: 'Max speed' },
  { name: 'SBJ', unit: 'cm', lower: false, desc: 'Explosive power' },
  { name: '505 Left', unit: 's', lower: true, desc: 'Agility left' },
  { name: '505 Right', unit: 's', lower: true, desc: 'Agility right' },
  { name: 'Push-Ups', unit: 'reps', lower: false, desc: 'Upper endurance' },
  { name: 'Pull-Ups', unit: 'reps', lower: false, desc: 'Pulling strength' },
  { name: 'Yo-Yo IR1', unit: 'm', lower: false, desc: 'Aerobic fitness' },
  { name: 'RSA Sdec%', unit: '%', lower: true, desc: 'Sprint fatigue' },
  { name: 'Bronco', unit: 's', lower: true, desc: 'Fitness run' },
];

const BENCHMARKS: Record<string, { u1415: number[]; u1618: number[] }> = {
  'SBJ':        { u1415: [195,175,155,135], u1618: [215,195,175,155] },
  '10m Sprint': { u1415: [1.72,1.82,1.92,2.02], u1618: [1.65,1.75,1.85,1.95] },
  '30m Sprint': { u1415: [4.25,4.45,4.65,4.85], u1618: [4.05,4.25,4.45,4.65] },
  '505 Left':   { u1415: [2.35,2.50,2.65,2.80], u1618: [2.25,2.40,2.55,2.70] },
  '505 Right':  { u1415: [2.35,2.50,2.65,2.80], u1618: [2.25,2.40,2.55,2.70] },
  'Push-Ups':   { u1415: [40,30,20,10], u1618: [50,38,26,14] },
  'Pull-Ups':   { u1415: [10,7,4,1], u1618: [10,7,4,1] },
  'Yo-Yo IR1':  { u1415: [1200,900,700,500], u1618: [1600,1200,900,600] },
  'RSA Sdec%':  { u1415: [3.0,5.0,7.0,10.0], u1618: [2.5,4.0,6.0,9.0] },
};

function getTierColor(testName: string, value: number, ageGroup: string) {
  const b = BENCHMARKS[testName]; if (!b) return 'border-slate-700 bg-slate-800/40';
  const lower = TEST_LIBRARY.find((t) => t.name === testName)?.lower ?? false;
  const t = ageGroup.includes('14') || ageGroup.includes('15') ? b.u1415 : b.u1618;
  let tier: number;
  if (lower) { tier = value < t[0] ? 0 : value < t[1] ? 1 : value < t[2] ? 2 : value < t[3] ? 3 : 4; }
  else { tier = value > t[0] ? 0 : value > t[1] ? 1 : value > t[2] ? 2 : value > t[3] ? 3 : 4; }
  return tier === 0 ? 'border-emerald-500/50 bg-emerald-500/10' : tier === 1 ? 'border-sky-500/50 bg-sky-500/10' : tier === 2 ? 'border-amber-500/50 bg-amber-500/10' : tier === 3 ? 'border-orange-500/50 bg-orange-500/10' : 'border-red-500/50 bg-red-500/10';
}

function getTierTextColor(testName: string, value: number, ageGroup: string) {
  const b = BENCHMARKS[testName]; if (!b) return 'text-white';
  const lower = TEST_LIBRARY.find((t) => t.name === testName)?.lower ?? false;
  const t = ageGroup.includes('14') || ageGroup.includes('15') ? b.u1415 : b.u1618;
  let tier: number;
  if (lower) { tier = value < t[0] ? 0 : value < t[1] ? 1 : value < t[2] ? 2 : value < t[3] ? 3 : 4; }
  else { tier = value > t[0] ? 0 : value > t[1] ? 1 : value > t[2] ? 2 : value > t[3] ? 3 : 4; }
  return tier === 0 ? 'text-emerald-300' : tier === 1 ? 'text-sky-300' : tier === 2 ? 'text-amber-300' : tier === 3 ? 'text-orange-300' : 'text-red-300';
}

export default function PerformancePage() {
  // Step state
  const { showToast } = useToast();
  const [step, setStep] = React.useState<'setup' | 'capture' | 'done'>('setup');

  // Setup
  const [selectedTeam, setSelectedTeam] = React.useState('');
  const [selectedTests, setSelectedTests] = React.useState<string[]>([]);
  const [sessionDate, setSessionDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [customTest, setCustomTest] = React.useState('');
  const [customUnit, setCustomUnit] = React.useState('');

  // Athletes + results
  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Record<string, Record<string, string>>>({});
  const [saved, setSaved] = React.useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = React.useState<Record<string, Record<string, boolean>>>({});
  const [loadingAthletes, setLoadingAthletes] = React.useState(false);
  const [activeAthlete, setActiveAthlete] = React.useState<string | null>(null);



  function toggleTest(name: string) {
    setSelectedTests((prev) => prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]);
  }

  function addCustomTest() {
    if (!customTest.trim()) return;
    const name = customTest.trim();
    if (!selectedTests.includes(name)) setSelectedTests((prev) => [...prev, name]);
    setCustomTest(''); setCustomUnit('');
  }

  async function startSession() {
    if (!selectedTeam || selectedTests.length === 0) return;
    setLoadingAthletes(true);
    const { data } = await supabase.from('athletes').select('id, full_name, age_group, position').eq('team', selectedTeam).order('full_name');
    setAthletes(data || []);
    // Pre-load existing results for today
    if (data && data.length > 0) {
      const ids = data.map((a) => a.id);
      const { data: existing } = await supabase.from('performance_tests')
        .select('*').in('athlete_id', ids).eq('test_date', sessionDate).in('test_type', selectedTests);
      const preloaded: typeof results = {};
      const preSaved: typeof saved = {};
      (existing || []).forEach((r) => {
        if (!preloaded[r.athlete_id]) preloaded[r.athlete_id] = {};
        if (!preSaved[r.athlete_id]) preSaved[r.athlete_id] = {};
        preloaded[r.athlete_id][r.test_type] = String(r.value);
        preSaved[r.athlete_id][r.test_type] = true;
      });
      setResults(preloaded);
      setSaved(preSaved);
    }
    setLoadingAthletes(false);
    setStep('capture');
  }

  async function saveResult(athleteId: string, testName: string, value: string) {
    const num = Number(value);
    if (!value.trim() || Number.isNaN(num)) return;
    setSaving((prev) => ({ ...prev, [athleteId]: { ...prev[athleteId], [testName]: true } }));
    const unit = TEST_LIBRARY.find((t) => t.name === testName)?.unit || '';
    // Upsert — delete existing then insert
    await supabase.from('performance_tests').delete()
      .eq('athlete_id', athleteId).eq('test_date', sessionDate).eq('test_type', testName);
    const { error: insertErr } = await supabase.from('performance_tests').insert([{
      athlete_id: athleteId, test_date: sessionDate, test_type: testName, value: num, unit,
    }]);
    if (insertErr) { showToast('Failed to save result', 'error'); }
    else { setSaved((prev) => ({ ...prev, [athleteId]: { ...prev[athleteId], [testName]: true } })); }
    setSaving((prev) => ({ ...prev, [athleteId]: { ...prev[athleteId], [testName]: false } }));
  }

  function handleInputChange(athleteId: string, testName: string, value: string) {
    setResults((prev) => ({ ...prev, [athleteId]: { ...prev[athleteId], [testName]: value } }));
    setSaved((prev) => ({ ...prev, [athleteId]: { ...prev[athleteId], [testName]: false } }));
  }

  function handleInputBlur(athleteId: string, testName: string, value: string) {
    saveResult(athleteId, testName, value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, athleteId: string, testName: string, value: string) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      saveResult(athleteId, testName, value);
      // Move to next athlete's same test
      const currentIdx = athletes.findIndex((a) => a.id === athleteId);
      const nextAthlete = athletes[currentIdx + 1];
      if (nextAthlete) {
        e.preventDefault();
        const nextInput = document.getElementById(`input-${nextAthlete.id}-${testName}`);
        nextInput?.focus();
      }
    }
  }

  const completedCount = React.useMemo(() => {
    return athletes.filter((a) => selectedTests.every((t) => saved[a.id]?.[t])).length;
  }, [athletes, selectedTests, saved]);

  const partialCount = React.useMemo(() => {
    return athletes.filter((a) => selectedTests.some((t) => saved[a.id]?.[t]) && !selectedTests.every((t) => saved[a.id]?.[t])).length;
  }, [athletes, selectedTests, saved]);

  // ── RENDER ────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-400">Testing</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Performance Testing</h1>
          {step === 'capture' && (
            <div className="mt-2 flex items-center gap-3">
              <button onClick={() => setStep('setup')} className="text-xs text-slate-500 hover:text-slate-300">← Back to setup</button>
            </div>
          )}
        </div>


        {/* ── SETUP STEP ─────────────────────────────────── */}
        {step === 'setup' && (
          <div className="space-y-6">

            {/* Team + Date */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-sky-400">Step 1 — Session Details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black text-slate-400">Team</label>
                  <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-sky-500">
                    <option value="">Select team...</option>
                    {TEAM_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.teams.map((t) => <option key={t} value={t}>{t}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black text-slate-400">Date</label>
                  <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-sky-500" />
                </div>
              </div>
            </div>

            {/* Test selection */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-violet-400">Step 2 — Select Tests</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TEST_LIBRARY.map((test) => {
                  const isSelected = selectedTests.includes(test.name);
                  return (
                    <button key={test.name} onClick={() => toggleTest(test.name)}
                      className={`rounded-xl border p-3 text-left transition ${isSelected ? 'border-violet-500/50 bg-violet-500/15' : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'}`}>
                      <p className={`text-sm font-black ${isSelected ? 'text-violet-300' : 'text-white'}`}>{test.name}</p>
                      <p className="text-[10px] text-slate-500">{test.desc} · {test.unit}</p>
                      {isSelected && <p className="mt-1 text-[9px] font-black text-violet-400">✓ Selected</p>}
                    </button>
                  );
                })}
              </div>

              {/* Custom test */}
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <input value={customTest} onChange={(e) => setCustomTest(e.target.value)} placeholder="Custom test name..."
                    onKeyDown={(e) => e.key === 'Enter' && addCustomTest()}
                    className="flex-1 min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500" />
                  <input value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} placeholder="Unit"
                    className="w-16 shrink-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
                  <button onClick={addCustomTest} className="shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-black text-slate-300 hover:text-white">Add</button>
                </div>
              </div>

              {selectedTests.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedTests.map((t) => (
                    <span key={t} className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">
                      {t}
                      <button onClick={() => setSelectedTests((prev) => prev.filter((x) => x !== t))} className="text-violet-500 hover:text-white">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Start button */}
            <button onClick={startSession} disabled={!selectedTeam || selectedTests.length === 0 || loadingAthletes}
              className="w-full rounded-2xl border border-violet-500 bg-violet-500/15 py-4 text-lg font-black text-violet-300 transition hover:bg-violet-500/25 disabled:opacity-40">
              {loadingAthletes ? 'Loading squad...' : `Start Testing Session →`}
            </button>
          </div>
        )}

        {/* ── CAPTURE STEP ───────────────────────────────── */}
        {step === 'capture' && (
          <div>
            {/* Session info + progress */}
            <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Live Session</p>
                  <h2 className="mt-0.5 text-2xl font-black text-white">{selectedTeam}</h2>
                  <p className="text-sm text-slate-500">{new Date(sessionDate).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })} · {selectedTests.join(', ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{completedCount}<span className="text-lg text-slate-500">/{athletes.length}</span></p>
                  <p className="text-xs text-slate-500">completed</p>
                  {partialCount > 0 && <p className="text-[10px] text-amber-400">{partialCount} partial</p>}
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${athletes.length > 0 ? (completedCount / athletes.length) * 100 : 0}%` }} />
              </div>
            </div>

            {/* If single test — compact list */}
            {selectedTests.length === 1 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div className="border-b border-slate-800 bg-slate-900/80 px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-black text-white">{selectedTests[0]}</p>
                  <p className="text-xs text-slate-500">{TEST_LIBRARY.find((t) => t.name === selectedTests[0])?.unit}</p>
                </div>
                <div className="divide-y divide-slate-800/50">
                  {athletes.map((athlete, idx) => {
                    const testName = selectedTests[0];
                    const val = results[athlete.id]?.[testName] || '';
                    const isSaved = saved[athlete.id]?.[testName];
                    const isSaving = saving[athlete.id]?.[testName];
                    const num = Number(val);
                    const showColor = isSaved && !Number.isNaN(num) && val !== '';
                    const name = athlete.full_name || 'Unknown';
                    const ageGroup = athlete.age_group || '';
                    return (
                      <div key={athlete.id} className={`flex items-center gap-3 px-4 py-3 transition ${activeAthlete === athlete.id ? 'bg-slate-800/40' : ''}`}>
                        <span className="w-5 shrink-0 text-center text-[10px] font-black text-slate-600">{idx + 1}</span>
                        <p className="flex-1 text-sm font-semibold text-white truncate">{name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            id={`input-${athlete.id}-${testName}`}
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={val}
                            onChange={(e) => handleInputChange(athlete.id, testName, e.target.value)}
                            onBlur={(e) => handleInputBlur(athlete.id, testName, e.target.value)}
                            onFocus={() => setActiveAthlete(athlete.id)}
                            onKeyDown={(e) => handleKeyDown(e, athlete.id, testName, val)}
                            placeholder="—"
                            className={`w-24 rounded-xl border px-3 py-2 text-right text-sm font-black outline-none transition ${showColor ? getTierColor(testName, num, ageGroup) + ' ' + getTierTextColor(testName, num, ageGroup) : 'border-slate-700 bg-slate-800 text-white focus:border-violet-500'}`}
                          />
                          <div className="w-4">
                            {isSaving ? <div className="h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" /> : isSaved ? <span className="text-emerald-400 text-sm">✓</span> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Multi-test — athlete cards */
              <div className="space-y-3">
                {athletes.map((athlete) => {
                  const name = athlete.full_name || 'Unknown';
                  const ageGroup = athlete.age_group || '';
                  const allDone = selectedTests.every((t) => saved[athlete.id]?.[t]);
                  const isOpen = activeAthlete === athlete.id;
                  return (
                    <div key={athlete.id} className={`rounded-2xl border transition ${allDone ? 'border-emerald-500/20 bg-emerald-500/5' : isOpen ? 'border-violet-500/30 bg-violet-500/5' : 'border-slate-800 bg-slate-900'}`}>
                      <button onClick={() => setActiveAthlete(isOpen ? null : athlete.id)}
                        className="flex w-full items-center gap-3 px-5 py-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300">
                          {(athlete.full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold text-white">{name}</p>
                          <p className="text-[10px] text-slate-500">
                            {selectedTests.filter((t) => saved[athlete.id]?.[t]).length}/{selectedTests.length} tests done
                          </p>
                        </div>
                        {allDone
                          ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">Complete ✓</span>
                          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-4 w-4 text-slate-500 transition ${isOpen ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6"/></svg>
                        }
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-800 px-5 pb-4 pt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {selectedTests.map((testName) => {
                            const val = results[athlete.id]?.[testName] || '';
                            const isSaved = saved[athlete.id]?.[testName];
                            const isSaving = saving[athlete.id]?.[testName];
                            const num = Number(val);
                            const showColor = isSaved && !Number.isNaN(num) && val !== '';
                            const unit = TEST_LIBRARY.find((t) => t.name === testName)?.unit || '';
                            return (
                              <div key={testName}>
                                <div className="mb-1 flex items-center justify-between">
                                  <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">{testName}</label>
                                  {isSaving ? <div className="h-2.5 w-2.5 animate-spin rounded-full border border-violet-400 border-t-transparent" /> : isSaved ? <span className="text-[10px] text-emerald-400">✓</span> : null}
                                </div>
                                <div className="relative">
                                  <input
                                    id={`input-${athlete.id}-${testName}`}
                                    type="number"
                                    step="any"
                                    inputMode="decimal"
                                    value={val}
                                    onChange={(e) => handleInputChange(athlete.id, testName, e.target.value)}
                                    onBlur={(e) => handleInputBlur(athlete.id, testName, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, athlete.id, testName, val)}
                                    placeholder="—"
                                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-black outline-none transition ${showColor ? getTierColor(testName, num, ageGroup) + ' ' + getTierTextColor(testName, num, ageGroup) : 'border-slate-700 bg-slate-800 text-white focus:border-violet-500'}`}
                                  />
                                  {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">{unit}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Done button */}
            <button onClick={() => { setStep('done'); showToast('Session saved!'); }}
              className="mt-6 w-full rounded-2xl border border-emerald-500 bg-emerald-500/15 py-4 text-lg font-black text-emerald-300 hover:bg-emerald-500/25 transition">
              Finish Session — {completedCount}/{athletes.length} complete
            </button>
          </div>
        )}

        {/* ── DONE STEP ──────────────────────────────────── */}
        {step === 'done' && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-2xl font-black text-white">Session Complete</h2>
            <p className="mt-2 text-slate-400">{completedCount} of {athletes.length} players tested · {selectedTests.join(', ')}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button onClick={() => { setStep('setup'); setSelectedTeam(''); setSelectedTests([]); setAthletes([]); setResults({}); setSaved({}); }}
                className="rounded-xl border border-violet-500 bg-violet-500/15 px-6 py-3 font-black text-violet-300 hover:bg-violet-500/25">
                New Session
              </button>
              <button onClick={() => { setStep('capture'); }}
                className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 font-black text-slate-300 hover:text-white">
                Back to Session
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
