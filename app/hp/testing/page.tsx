'use client';
import * as React from 'react';
import Link from 'next/link';
import { GRADE8_TESTS, GRADE9_TESTS, parseTestValue, fmtValue } from '@/lib/hpTests';
import { HP_CLASSES } from '@/lib/hpConfig';
import { assignTrainingGroups, GROUP_COLORS } from '@/lib/hpScoring';

type Row = Record<string, any>;

// ── Validation ranges [min, max] ───────────────────────────────────────────────
const VALID: Record<string, [number, number]> = {
  sprint_10m:        [1.5,  4.0],
  sprint_30m:        [3.5,  8.0],
  run_500m:          [55,   360],   // seconds after parsing
  broad_jump:        [80,   320],
  chin_up_hang:      [1,    300],
  pushup_2min:       [1,    80],
  triple_broad_jump: [200,  1000],
};

function toSecs(v: string): number | null {
  if (!v) return null;
  if (v.includes(':')) { const [m,s] = v.split(':').map(Number); return m*60+s; }
  // mm.ss shorthand
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  if (v.includes('.')) {
    const sec = parseInt(v.split('.')[1] || '0');
    if (sec <= 59 && n < 10) return Math.floor(n)*60+sec;
  }
  return n;
}
function toMmss(secs: number): string {
  const m = Math.floor(secs/60), s = Math.round(secs%60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function validateField(key: string, rawVal: string): string | null {
  if (!rawVal.trim()) return null;
  const range = VALID[key];
  if (!range) return null;
  const num = key === 'run_500m' ? toSecs(rawVal) : parseFloat(rawVal);
  if (num === null || isNaN(num as number)) return 'Invalid value';
  const [mn, mx] = range;
  if ((num as number) < mn) return `Too low (min ${key === 'run_500m' ? toMmss(mn) : mn})`;
  if ((num as number) > mx) return `Too high (max ${key === 'run_500m' ? toMmss(mx) : mx})`;
  return null;
}

function hasValidationErrors(sid: string, results: Record<string, Row>, stuTests: typeof GRADE8_TESTS): boolean {
  const r = results[sid] || {};
  return stuTests.some(t => validateField(t.key, r[t.key] || '') !== null);
}

export default function HPTesting() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [term,     setTerm]     = React.useState('Term 2');
  const [year,     setYear]     = React.useState(2026);
  const [date,     setDate]     = React.useState(() => new Date().toISOString().split('T')[0]);
  const [selClass, setSelClass] = React.useState<string|null>(null);
  const [results,  setResults]  = React.useState<Record<string,Row>>({});
  const [saving,   setSaving]   = React.useState<Record<string,boolean>>({});
  const [saved,    setSaved]    = React.useState<Record<string,boolean>>({});
  const [openStu,  setOpenStu]  = React.useState<string|null>(null);
  const [nGroups,  setNGroups]  = React.useState(4);
  const [showGrp,  setShowGrp]  = React.useState(false);
  const [toast,    setToast]    = React.useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  React.useEffect(() => {
    fetch('/api/hp/students', { credentials:'include' })
      .then(r => r.json())
      .then(d => setStudents((d.students || []).sort((a:Row,b:Row) => {
        if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
        return a.full_name.localeCompare(b.full_name);
      })));
  }, []);

  React.useEffect(() => {
    if (!students.length) return;
    fetch('/api/hp/tests?term='+encodeURIComponent(term)+'&year='+year, { credentials:'include' })
      .then(r => r.json())
      .then(d => {
        const r: Record<string,Row> = {}, sv: Record<string,boolean> = {};
        (d.results || []).forEach((row:Row) => {
          r[row.student_id] = { ...row };
          if (row.run_500m) r[row.student_id].run_500m = toMmss(row.run_500m);
          sv[row.student_id] = true;
        });
        setResults(r); setSaved(sv);
      });
  }, [term, year, students.length]);

  const cls = React.useMemo(() => {
    if (!selClass) return [];
    if (selClass === 'Grade 8' || selClass === 'Grade 9') return students.filter(s => s.grade === selClass);
    const grade = selClass[0] === '8' ? 'Grade 8' : 'Grade 9';
    return students.filter(s => s.grade === grade && s.class_group === selClass[1]);
  }, [selClass, students]);

  const firstGrade = cls.length > 0 ? cls[0].grade : null;
  const mixed      = cls.some(s => s.grade !== firstGrade);
  const tests      = firstGrade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
  const done       = cls.filter(s => saved[s.id]).length;

  // Use shared hpScoring for groups
  const resultsForGrouping = React.useMemo(() => {
    const map: Record<string,Row> = {};
    Object.entries(results).forEach(([id, r]) => {
      const row: Row = { ...r };
      if (row.run_500m) row.run_500m = toSecs(row.run_500m);
      map[id] = row;
    });
    return map;
  }, [results]);

  const groupAssignment = React.useMemo(() => {
    if (!cls.length || mixed) return {};
    return assignTrainingGroups(cls, resultsForGrouping, nGroups);
  }, [cls, resultsForGrouping, nGroups, mixed]);

  async function saveResults(sid: string) {
    const vals  = results[sid] || {};
    const stu   = students.find(s => s.id === sid);
    const t     = stu?.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;

    if (hasValidationErrors(sid, results, t)) {
      showToast('Fix validation errors before saving');
      return;
    }

    setSaving(p => ({ ...p, [sid]:true }));
    const payload: Row = { student_id:sid, term, year, test_date:date };
    t.forEach(x => {
      payload[x.key] = x.key === 'run_500m'
        ? toSecs(vals[x.key] || '')
        : (vals[x.key] ? parseFloat(vals[x.key]) : null);
    });
    await fetch('/api/hp/tests', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'upsert', payload }),
    });
    setSaved(p => ({ ...p, [sid]:true }));
    setSaving(p => ({ ...p, [sid]:false }));
    setOpenStu(null);
    showToast('Results saved ✓');
  }

  async function saveGroups() {
    await Promise.all(
      Object.entries(groupAssignment).map(([id, group]) =>
        fetch('/api/hp/students', {
          method:'POST', credentials:'include',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'update_group', id, training_group: group }),
        })
      )
    );
    setStudents(prev => prev.map(s => {
      const g = groupAssignment[s.id];
      return g !== undefined ? { ...s, training_group: g } : s;
    }));
    showToast('Groups saved ✓');
  }

  const selBtn = (active: boolean, col: 'sky'|'violet'|'emerald') => {
    const on = { sky:'border-sky-500/40 bg-sky-500/15 text-sky-300', violet:'border-violet-500/40 bg-violet-500/15 text-violet-300', emerald:'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' }[col];
    return `rounded-xl border py-2.5 text-sm font-black transition ${active ? on : 'border-white/8 bg-white/5 text-white/40 hover:text-white'}`;
  };

  return (
    <main className="min-h-screen pt-[54px] text-white lg:pt-0" style={{ background:'#060c1a' }}>
      {toast && <div style={{ position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.4)',borderRadius:12,padding:'11px 20px',color:'#10b981',fontWeight:700,fontSize:13,backdropFilter:'blur(12px)',whiteSpace:'nowrap' }}>{toast}</div>}

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-white/30 hover:text-white/60 transition">← High Performance</Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
            <h1 className="mt-1 text-3xl font-black text-white">Testing</h1>
          </div>
          <Link href="/hp/import" className="mt-1 flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M4 12l8-8 8 8M12 4v12"/></svg>
            Bulk Import
          </Link>
        </div>

        {/* Step 1 */}
        <div className="mb-5 rounded-2xl border border-white/6 bg-white/2 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-white/30">Step 1 — Session Setup</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={term} onChange={e => setTerm(e.target.value)}
              style={{ background:'#0d1424', color:'white' }}
              className="rounded-xl border border-white/8 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
              {['Term 1','Term 2','Term 3','Term 4'].map(t => <option key={t} style={{ background:'#0d1424' }}>{t}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              style={{ background:'#0d1424', color:'white' }}
              className="rounded-xl border border-white/8 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
              {[2025,2026,2027].map(y => <option key={y} style={{ background:'#0d1424' }}>{y}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ background:'#0d1424', color:'white', colorScheme:'dark' }}
              className="rounded-xl border border-white/8 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/30">Select Class</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSelClass('Grade 8')} className={selBtn(selClass==='Grade 8','sky')}>Grade 8 (all classes)</button>
              <button onClick={() => setSelClass('Grade 9')} className={selBtn(selClass==='Grade 9','violet')}>Grade 9 (all classes)</button>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Grade 8 — by class</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => (
                  <button key={'8'+c} onClick={() => setSelClass('8'+c)} className={selBtn(selClass==='8'+c,'sky')}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-violet-400">Grade 9 — by class</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => (
                  <button key={'9'+c} onClick={() => setSelClass('9'+c)} className={selBtn(selClass==='9'+c,'violet')}>{c}</button>
                ))}
              </div>
            </div>
          </div>

          {firstGrade && !mixed && (
            <div className="mt-3 rounded-xl border border-white/6 bg-white/3 px-4 py-2.5">
              <p className="text-xs text-white/40">
                <span className="font-black text-white">{firstGrade} battery:</span>{' '}
                {tests.map(t => `${t.label} (${t.unit})`).join(' · ')}
              </p>
            </div>
          )}
        </div>

        {/* Step 2 */}
        <div className="mb-5 rounded-2xl border border-white/6 bg-white/2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-white/30">Step 2 — Enter Results</p>
            <span className="text-xs text-white/25">{done}/{cls.length} complete</span>
          </div>

          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: cls.length > 0 ? `${(done/cls.length)*100}%` : '0%' }}/>
          </div>

          {!selClass && (
            <p className="py-8 text-center text-sm text-white/25">Select a class above to enter results</p>
          )}

          {selClass && mixed && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
              <p className="text-sm font-black text-amber-400">⚠ Mixed grades selected</p>
              <p className="text-xs text-amber-300/70 mt-1">Grade 8 and Grade 9 use different test batteries. Select a single grade or class to enter results.</p>
            </div>
          )}

          {selClass && !mixed && (
            <div className="space-y-2">
              {cls.map(s => {
                const isOpen = openStu === s.id;
                const isDone = saved[s.id];
                const stuTests = s.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
                const ini = s.full_name.split(' ').map((n:string) => n[0]||'').join('').slice(0,2).toUpperCase();
                const hasErrors = isOpen && hasValidationErrors(s.id, results, stuTests);

                return (
                  <div key={s.id} className={`rounded-2xl border transition ${isDone ? 'border-emerald-500/20 bg-emerald-500/5' : isOpen ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/6 bg-white/2'}`}>
                    <button onClick={() => setOpenStu(isOpen ? null : s.id)} className="flex w-full items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-black text-white/60">{ini}</div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-white">{s.full_name}</p>
                        <p className="text-[10px] text-white/30">{s.grade}{s.class_group ? ' · '+s.class_group : ''}{s.training_group ? ' · G'+s.training_group : ''}</p>
                      </div>
                      {isDone && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">Saved ✓</span>}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-4 w-4 text-white/20 transition ${isOpen ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6"/></svg>
                    </button>

                    {isOpen && (
                      <div className="border-t border-white/5 px-4 pb-4 pt-3">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {stuTests.map(t => {
                            const raw = results[s.id]?.[t.key] || '';
                            const err = validateField(t.key, raw);
                            return (
                              <div key={t.key}>
                                <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-white/30">
                                  {t.label} ({t.unit})
                                </label>
                                <input
                                  type={t.unit === 'mm:ss' ? 'text' : 'number'}
                                  step="any" inputMode="decimal"
                                  value={raw}
                                  onChange={e => setResults(p => ({ ...p, [s.id]: { ...(p[s.id]||{}), [t.key]: e.target.value } }))}
                                  placeholder={t.unit === 'mm:ss' ? '2:05' : '—'}
                                  style={{ background:'#0d1424', color:'white', borderColor: err ? '#f87171' : undefined }}
                                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-500 ${err ? 'border-red-500/60' : 'border-white/8'}`}
                                />
                                {err && <p className="mt-0.5 text-[9px] font-black text-red-400">{err}</p>}
                              </div>
                            );
                          })}
                        </div>
                        {hasErrors && (
                          <p className="mt-3 text-[10px] font-black text-amber-400">⚠ Fix the values above before saving</p>
                        )}
                        <button onClick={() => saveResults(s.id)} disabled={saving[s.id]}
                          className="mt-4 w-full rounded-xl border border-emerald-500 bg-emerald-500/15 py-2.5 text-sm font-black text-emerald-300 disabled:opacity-50 hover:bg-emerald-500/25 transition">
                          {saving[s.id] ? 'Saving…' : 'Save Results'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3 — Groups */}
        {cls.length > 0 && done > 0 && !mixed && (
          <div className="rounded-2xl border border-white/6 bg-white/2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-white/30">Step 3 — Assign Training Groups</p>
              <button onClick={() => setShowGrp(v => !v)} className="text-xs text-white/35 hover:text-white transition">
                {showGrp ? 'Hide' : 'Show'} preview
              </button>
            </div>
            <div className="mb-4 flex items-center gap-4 flex-wrap">
              <p className="text-sm text-white/40">Number of groups</p>
              <div className="flex gap-2">
                {[2,3,4,5].map(n => (
                  <button key={n} onClick={() => setNGroups(n)}
                    className={`rounded-xl border px-4 py-2 text-sm font-black transition ${nGroups===n ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-white/8 bg-white/5 text-white/35 hover:text-white'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {showGrp && (
              <div className="mb-4 max-h-64 space-y-1 overflow-y-auto">
                {cls.map(s => {
                  const g = groupAssignment[s.id] ?? s.training_group;
                  const gc = GROUP_COLORS[g] || 'border-white/8 bg-white/5 text-white/30';
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-3 py-2">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black border ${gc}`}>{g || '?'}</span>
                      <span className="flex-1 text-sm text-white">{s.full_name}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={saveGroups}
              className="w-full rounded-xl border border-emerald-500 bg-emerald-500/15 py-2.5 text-sm font-black text-emerald-300 hover:bg-emerald-500/25 transition">
              Save Training Groups
            </button>
            <p className="mt-2 text-center text-[10px] text-white/20">Best performers → Group 1. Assigned by composite performance score.</p>
          </div>
        )}
      </div>
    </main>
  );
}
