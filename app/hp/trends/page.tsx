'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import { GRADE8_TESTS, GRADE9_TESTS, TIERS, getTier, fmtValue, fmtValueWithUnit, TERM_ORDER, type TestKey } from '@/lib/hpTests';
import { HP_CLASSES } from '@/lib/hpConfig';
import {
  movementSummary, topMovers, watchList, cohortStats,
  percentileRank, termSeries, classifyChange,
} from '@/lib/hpAnalytics';

type Row = Record<string, any>;

const BD = 'rgba(255,255,255,0.07)';
const CARD = 'rgba(255,255,255,0.015)';
const PANEL = '#0d1424';

function surname(full: string) { return full.trim().split(' ').pop() || full; }

// ─── Tier pill ────────────────────────────────────────────────────────────────
function TierPill({ label, size = 'sm' }: { label: string; size?: 'sm'|'xs' }) {
  const t = TIERS.find(x => x.label === label) || TIERS[2];
  return (
    <span className={`rounded-full font-black whitespace-nowrap ${size==='sm'?'px-2 py-0.5 text-[9px]':'px-1.5 py-px text-[8px]'}`}
      style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
      {t.label}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HPTrendsPage() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [grade, setGrade] = React.useState<'Grade 8'|'Grade 9'>('Grade 8');
  const [selYear, setSelYear] = React.useState(() => new Date().getFullYear());
  const [selTest, setSelTest] = React.useState<string|null>(null);
  const [scopeClass, setScopeClass] = React.useState<string|null>(null);
  const [showUntested, setShowUntested] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/hp/data?type=trends', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setStudents((d.students || []).sort((a: Row, b: Row) =>
          surname(a.full_name).toLowerCase().localeCompare(surname(b.full_name).toLowerCase())));
        setResults(d.tests || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isG8 = grade === 'Grade 8';
  const gradeColor = isG8 ? '#38bdf8' : '#a78bfa';
  const tests = isG8 ? GRADE8_TESTS : GRADE9_TESTS;
  const gradeStudents = React.useMemo(() => students.filter(s => s.grade === grade), [students, grade]);

  // Latest result per student for the selected year (year → term → date ordered)
  const latestMap = React.useMemo(() => {
    const sorted = [...results]
      .filter(r => r.year === selYear)
      .sort((a, b) => {
        const ta = TERM_ORDER.indexOf(a.term), tb = TERM_ORDER.indexOf(b.term);
        if (ta !== tb) return ta - tb;
        return (a.test_date || '').localeCompare(b.test_date || '');
      });
    const map: Record<string, Row> = {};
    sorted.forEach(r => { map[r.student_id] = r; });
    return map;
  }, [results, selYear]);

  // Terms that actually have data this year (drives term columns everywhere)
  const activeTerms = React.useMemo(() => {
    const present = new Set(results.filter(r => r.year === selYear).map(r => r.term));
    return TERM_ORDER.filter(t => present.has(t));
  }, [results, selYear]);

  // Cohort stats + insights
  const stats = React.useMemo(
    () => cohortStats(gradeStudents, results, tests, selYear),
    [gradeStudents, results, tests, selYear]);
  const insights = React.useMemo(() => {
    if (!gradeStudents.length) return null;
    const move = movementSummary(gradeStudents, results, tests, selYear);
    if (move.comparisons === 0) return null;
    return {
      move,
      movers: topMovers(gradeStudents, results, tests, selYear, 3),
      watch: watchList(gradeStudents, results, tests, selYear, 6),
    };
  }, [gradeStudents, results, tests, selYear]);

  const tested = gradeStudents.filter(s => latestMap[s.id]);
  const untested = gradeStudents.filter(s => !latestMap[s.id]);
  const classes = HP_CLASSES.filter(c => gradeStudents.some(s => s.class_group === c));

  // Term averages for a student set + test
  const termAvgs = React.useCallback((ss: Row[], key: string) =>
    activeTerms.map(term => {
      const vals = ss.map(s => {
        const r = results.find(r => r.student_id === s.id && r.term === term && r.year === selYear);
        const v = r ? parseFloat(r[key]) : NaN;
        return isNaN(v) ? null : v;
      }).filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }), [activeTerms, results, selYear]);

  function resetView() { setSelTest(null); setScopeClass(null); }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#060c1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #10b981', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const testObj = tests.find(t => t.key === selTest) || null;

  return (
    <main className="min-h-screen pt-[54px] text-white lg:pt-0" style={{ background: '#060c1a' }}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

        {/* ── HEADER + CONTROLS ── */}
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{ color: 'rgba(16,185,129,0.7)' }}>High Performance</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-4xl font-black tracking-tight leading-none text-white">Trends</h1>
            <div className="flex flex-wrap gap-2">
              {/* Year */}
              <div className="flex items-center gap-1 rounded-xl border p-1" style={{ background: 'rgba(255,255,255,0.03)', borderColor: BD }}>
                <button onClick={() => { setSelYear(y => y - 1); resetView(); }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="px-2 text-sm font-black text-white">{selYear}</span>
                <button onClick={() => { setSelYear(y => Math.min(y + 1, new Date().getFullYear())); resetView(); }}
                  disabled={selYear >= new Date().getFullYear()}
                  className="flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-30" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
              {/* Grade */}
              <div className="flex rounded-xl border p-0.5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: BD }}>
                {(['Grade 8', 'Grade 9'] as const).map(g => (
                  <button key={g} onClick={() => { setGrade(g); resetView(); }}
                    className="rounded-lg px-4 py-1.5 text-[11px] font-bold transition"
                    style={{
                      background: grade === g ? (g === 'Grade 8' ? 'rgba(56,189,248,0.15)' : 'rgba(167,139,250,0.15)') : 'transparent',
                      color: grade === g ? (g === 'Grade 8' ? '#38bdf8' : '#a78bfa') : 'rgba(255,255,255,0.4)',
                    }}>{g}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════ OVERVIEW ══════════════════ */}
        {!selTest && (
          <div className="space-y-5">

            {/* Stat band */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Athletes', val: gradeStudents.length, color: 'white' },
                { label: 'Tested', val: `${tested.length}`, sub: gradeStudents.length ? `${Math.round(tested.length / gradeStudents.length * 100)}%` : '', color: '#10b981' },
                { label: 'Untested', val: untested.length, color: untested.length ? '#fbbf24' : 'rgba(255,255,255,0.3)', click: untested.length > 0 },
              ].map(x => (
                <button key={x.label} disabled={!x.click} onClick={() => setShowUntested(v => !v)}
                  className="rounded-2xl border p-4 text-center transition disabled:cursor-default"
                  style={{ background: PANEL, borderColor: x.click && showUntested ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.06)', cursor: x.click ? 'pointer' : 'default' }}>
                  <p className="text-2xl font-black" style={{ color: x.color }}>{x.val}{x.sub && <span className="text-[11px] ml-1 opacity-60">{x.sub}</span>}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {x.label}{x.click ? ' ▾' : ''}
                  </p>
                </button>
              ))}
            </div>

            {/* Untested chase list */}
            {showUntested && untested.length > 0 && (
              <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.04)' }}>
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: '#fbbf24' }}>Not yet tested · {selYear}</p>
                <div className="flex flex-wrap gap-1.5">
                  {untested.map(s => (
                    <Link key={s.id} href={`/hp/students/${s.id}`}
                      className="rounded-lg border px-2 py-1 text-[11px] font-semibold transition hover:bg-white/5"
                      style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                      {surname(s.full_name)}{s.class_group ? ` · ${isG8 ? 8 : 9}${s.class_group}` : ''}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Cohort insights */}
            {insights && (
              <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BD}` }}>
                <div className="border-b px-5 py-3 flex flex-wrap items-center justify-between gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)', background: PANEL }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#10b981' }}>Cohort Movement · since previous test</p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>vs SWC (0.2 × cohort SD) — smaller shifts are normal variation</p>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                      ▲ {insights.move.improved} meaningful improvement{insights.move.improved === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      ≈ {insights.move.stable} within normal variation
                    </span>
                    <span className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                      ▼ {insights.move.declined} meaningful decline{insights.move.declined === 1 ? '' : 's'}
                    </span>
                  </div>
                  {(insights.movers.up.length > 0 || insights.movers.down.length > 0) && (
                    <div>
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Biggest movers</p>
                      <div className="flex flex-wrap gap-2">
                        {insights.movers.up.map(m => (
                          <Link key={m.id} href={`/hp/students/${m.id}`} className="rounded-xl border px-3 py-1.5 text-[11.5px] font-bold transition hover:brightness-125"
                            style={{ background: 'rgba(16,185,129,0.08)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)', textDecoration: 'none' }}>
                            {m.name} ↑
                          </Link>
                        ))}
                        {insights.movers.down.map(m => (
                          <Link key={m.id} href={`/hp/students/${m.id}`} className="rounded-xl border px-3 py-1.5 text-[11.5px] font-bold transition hover:brightness-125"
                            style={{ background: 'rgba(248,113,113,0.07)', color: '#f87171', borderColor: 'rgba(248,113,113,0.22)', textDecoration: 'none' }}>
                            {m.name} ↓
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {insights.watch.length > 0 && (
                    <div>
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Watch list — needs coach attention</p>
                      <div className="space-y-1.5">
                        {insights.watch.map(w => (
                          <Link key={w.id} href={`/hp/students/${w.id}`}
                            className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 transition hover:bg-white/[0.03]"
                            style={{ borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)', textDecoration: 'none' }}>
                            <span className="text-[12px] font-bold text-white">{w.name}</span>
                            {w.reasons.map(r => (
                              <span key={r} className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                                style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>{r}</span>
                            ))}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tests — tap to drill in */}
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BD}` }}>
              <div className="border-b px-5 py-3 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)', background: PANEL }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: gradeColor }}>{grade} · Tests · {selYear}</p>
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Tap a test to drill in</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {tests.map(t => {
                  const st = stats[t.key];
                  const avg = st.values.length ? st.mean : null;
                  const tier = avg !== null ? getTier(t.key as TestKey, avg, t.lower) : null;
                  const avgs = termAvgs(gradeStudents, t.key);
                  const chartData = activeTerms.map((term, i) => ({ name: term.replace('Term ', 'T'), val: avgs[i] })).filter(d => d.val !== null);
                  const validTerms = avgs.filter((v): v is number => v !== null);
                  const improved = validTerms.length > 1 && (t.lower ? validTerms[validTerms.length - 1] < validTerms[0] : validTerms[validTerms.length - 1] > validTerms[0]);
                  const pt = insights?.move.perTest.find(x => x.key === t.key);
                  const moved = pt ? pt.improved + pt.declined + pt.stable : 0;
                  return (
                    <button key={t.key} onClick={() => setSelTest(t.key)}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02] cursor-pointer">
                      <div className="w-32 shrink-0">
                        <p className="text-[12.5px] font-bold text-white">{t.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{st.values.length} tested</p>
                      </div>
                      <div className="w-24 shrink-0">
                        {avg !== null && tier ? (
                          <>
                            <p className="text-[15px] font-black" style={{ color: tier.color }}>{fmtValueWithUnit(t.key as TestKey, avg)}</p>
                            <TierPill label={tier.label}/>
                          </>
                        ) : <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>No data</p>}
                      </div>
                      <div className="flex-1 min-w-0 h-10">
                        {chartData.length > 1 && (
                          <ResponsiveContainer width="100%" height={40}>
                            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                              <Line type="monotone" dataKey="val" stroke={improved ? '#10b981' : '#f87171'} strokeWidth={2} dot={{ r: 2, fill: improved ? '#10b981' : '#f87171' }} activeDot={false}/>
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <div className="shrink-0 text-right hidden sm:block">
                        {pt && moved > 0 && (
                          <>
                            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Moved</p>
                            <p className="text-[11px] font-black">
                              <span style={{ color: '#10b981' }}>▲{pt.improved}</span>{' '}
                              <span style={{ color: '#f87171' }}>▼{pt.declined}</span>
                            </p>
                          </>
                        )}
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} className="h-3.5 w-3.5 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Class × test heatmap */}
            {classes.length > 1 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BD}` }}>
                <div className="border-b px-5 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)', background: PANEL }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: gradeColor }}>Class Comparison · latest averages</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BD}` }}>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Class</th>
                        {tests.map(t => (
                          <th key={t.key} className="px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-[0.08em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map(cls => {
                        const cs = gradeStudents.filter(s => s.class_group === cls);
                        return (
                          <tr key={cls} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                            <td className="px-4 py-2.5 text-[12px] font-black" style={{ color: gradeColor }}>{isG8 ? 8 : 9}{cls}</td>
                            {tests.map(t => {
                              const vals = cs.map(s => { const r = latestMap[s.id]; const v = r ? parseFloat(r[t.key]) : NaN; return isNaN(v) ? null : v; }).filter((v): v is number => v !== null);
                              if (!vals.length) return <td key={t.key} className="px-3 py-2.5 text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.15)' }}>—</td>;
                              const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                              const tier = getTier(t.key as TestKey, avg, t.lower);
                              return (
                                <td key={t.key} className="px-1.5 py-1.5 text-center">
                                  <button onClick={() => { setSelTest(t.key); setScopeClass(cls); }}
                                    className="w-full rounded-lg px-2 py-1.5 text-[11px] font-black transition hover:brightness-125 cursor-pointer"
                                    style={{ background: `${tier.border}1c`, color: tier.border, border: `1px solid ${tier.border}35` }}
                                    title={`${tier.label} — tap to drill in`}>
                                    {fmtValue(t.key as TestKey, avg)}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="px-5 py-2.5 text-[9px]" style={{ color: 'rgba(255,255,255,0.2)', borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                  Cell colour = tier of the class average · tap any cell to open that test scoped to the class
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TEST DETAIL ══════════════════ */}
        {selTest && testObj && (() => {
          const scoped = scopeClass ? gradeStudents.filter(s => s.class_group === scopeClass) : gradeStudents;
          const vals = scoped.map(s => {
            const r = latestMap[s.id]; const v = r ? parseFloat(r[testObj.key]) : NaN;
            return isNaN(v) ? null : { id: s.id, name: surname(s.full_name), val: v, group: s.training_group, cls: s.class_group };
          }).filter((x): x is { id: string; name: string; val: number; group: number|null; cls: string|null } => x !== null);
          const sortedVals = [...vals].sort((a, b) => testObj.lower ? a.val - b.val : b.val - a.val);
          const rawVals = vals.map(v => v.val);
          const scopedStats = cohortStats(scoped, results, [testObj], selYear)[testObj.key];
          const avg = scopedStats.values.length ? scopedStats.mean : null;
          const avgTier = avg !== null ? getTier(testObj.key as TestKey, avg, testObj.lower) : null;
          const avgs = termAvgs(scoped, testObj.key);
          const lineData = activeTerms.map((term, i) => ({ name: term.replace('Term ', 'T'), val: avgs[i] })).filter(d => d.val !== null);
          const counts: Record<string, number> = {};
          vals.forEach(x => { const l = getTier(testObj.key as TestKey, x.val, testObj.lower).label; counts[l] = (counts[l] || 0) + 1; });
          const statUnit = testObj.unit === 'mm:ss' ? 's' : testObj.unit;
          const barData = sortedVals.slice(0, 15).map(x => ({
            name: x.name.slice(0, 7), val: x.val,
            color: getTier(testObj.key as TestKey, x.val, testObj.lower).color,
          }));

          return (
            <div className="space-y-4">
              {/* Breadcrumb + scope */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <button onClick={resetView} className="hover:text-white transition cursor-pointer font-bold">{grade}</button>
                  <span>/</span>
                  <span className="text-white font-bold">{testObj.label}</span>
                  {scopeClass && <><span>/</span><span style={{ color: gradeColor }} className="font-bold">{isG8 ? 8 : 9}{scopeClass}</span></>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setScopeClass(null)}
                    className="rounded-lg border px-2.5 py-1 text-[10.5px] font-black transition cursor-pointer"
                    style={{
                      borderColor: !scopeClass ? `${gradeColor}60` : 'rgba(255,255,255,0.08)',
                      background: !scopeClass ? `${gradeColor}18` : 'transparent',
                      color: !scopeClass ? gradeColor : 'rgba(255,255,255,0.4)',
                    }}>All {grade}</button>
                  {classes.map(c => (
                    <button key={c} onClick={() => setScopeClass(scopeClass === c ? null : c)}
                      className="rounded-lg border px-2.5 py-1 text-[10.5px] font-black transition cursor-pointer"
                      style={{
                        borderColor: scopeClass === c ? `${gradeColor}60` : 'rgba(255,255,255,0.08)',
                        background: scopeClass === c ? `${gradeColor}18` : 'transparent',
                        color: scopeClass === c ? gradeColor : 'rgba(255,255,255,0.4)',
                      }}>{isG8 ? 8 : 9}{c}</button>
                  ))}
                </div>
              </div>

              {/* Other tests quick-switch */}
              <div className="flex flex-wrap gap-1.5">
                {tests.map(t => (
                  <button key={t.key} onClick={() => setSelTest(t.key)}
                    className="rounded-xl border px-3 py-1.5 text-[11px] font-bold transition cursor-pointer"
                    style={{
                      borderColor: selTest === t.key ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.07)',
                      background: selTest === t.key ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.02)',
                      color: selTest === t.key ? '#10b981' : 'rgba(255,255,255,0.4)',
                    }}>{t.label}</button>
                ))}
              </div>

              {/* Header card */}
              <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BD}` }}>
                <div className="px-5 py-5 border-b flex flex-wrap items-start justify-between gap-4"
                  style={{ borderColor: avgTier ? avgTier.border : BD, background: avgTier ? `${avgTier.border}10` : 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {testObj.label} · {scopeClass ? `Class ${isG8 ? 8 : 9}${scopeClass}` : grade}
                    </p>
                    {avg !== null && avgTier ? (
                      <>
                        <p className="text-4xl font-black" style={{ color: avgTier.border }}>{fmtValueWithUnit(testObj.key as TestKey, avg)}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <TierPill label={avgTier.label}/>
                          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>average · {vals.length}/{scoped.length} tested</span>
                        </div>
                        {vals.length > 2 && (
                          <p className="mt-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Median {fmtValue(testObj.key as TestKey, scopedStats.median)} · SD {scopedStats.sd.toFixed(2)}{statUnit} ·{' '}
                            <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>SWC ±{scopedStats.swc.toFixed(2)}{statUnit}</span>
                            {' '}— smaller changes are normal variation
                          </p>
                        )}
                      </>
                    ) : <p className="text-lg" style={{ color: 'rgba(255,255,255,0.25)' }}>No results yet</p>}
                  </div>
                  {/* Term trajectory */}
                  {lineData.length > 1 && (
                    <div className="w-full sm:w-56 h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                          <YAxis hide domain={['auto', 'auto']} reversed={testObj.lower}/>
                          <Tooltip
                            contentStyle={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }}
                            itemStyle={{ color: 'white' }} labelStyle={{ color: 'rgba(255,255,255,0.4)' }}
                            formatter={(v: any) => [fmtValueWithUnit(testObj.key as TestKey, v), 'avg']}/>
                          <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }}/>
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="text-center text-[8.5px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Term averages{testObj.lower ? ' (up = faster)' : ''}</p>
                    </div>
                  )}
                </div>

                {/* Distribution bar chart */}
                {barData.length > 0 && (
                  <div className="px-4 pt-4 pb-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <ResponsiveContainer width="100%" height={110}>
                      <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8 }} axisLine={false} tickLine={false}/>
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 8 }} axisLine={false} tickLine={false} domain={['auto', 'auto']}/>
                        {avg !== null && <ReferenceLine y={avg} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3"/>}
                        <Tooltip
                          contentStyle={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }}
                          itemStyle={{ color: 'white' }} labelStyle={{ color: 'rgba(255,255,255,0.4)' }}
                          formatter={(v: any) => [fmtValueWithUnit(testObj.key as TestKey, v), '']}/>
                        <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                          {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.75}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {sortedVals.length > 15 && <p className="pb-2 text-center text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Top 15 shown — full list below</p>}
                  </div>
                )}

                {/* Tier distribution */}
                <div className="px-5 py-3 border-b flex flex-wrap gap-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {TIERS.map(tier => {
                    const n = counts[tier.label] || 0;
                    return n > 0 ? (
                      <span key={tier.label} className="rounded-full px-3 py-1 text-[10px] font-black"
                        style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}>
                        {n} {tier.label}
                      </span>
                    ) : null;
                  })}
                  {(scoped.length - vals.length) > 0 && (
                    <span className="rounded-full px-3 py-1 text-[10px] font-bold"
                      style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {scoped.length - vals.length} untested
                    </span>
                  )}
                </div>

                {/* Rankings */}
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {sortedVals.map((x, i) => {
                    const tier = getTier(testObj.key as TestKey, x.val, testObj.lower);
                    const ser = termSeries(results, x.id, testObj.key, selYear);
                    const hasDelta = ser.length > 1;
                    const prevV = hasDelta ? ser[ser.length - 2].val : NaN;
                    const latV = hasDelta ? ser[ser.length - 1].val : NaN;
                    const chg = hasDelta ? classifyChange(prevV, latV, scopedStats.swc, testObj.lower) : null;
                    const rawD = hasDelta ? (testObj.lower ? prevV - latV : latV - prevV) : 0;
                    const pctDelta = hasDelta && prevV !== 0 ? Math.abs((rawD / prevV) * 100).toFixed(1) : null;
                    const pct = percentileRank(rawVals, x.val, testObj.lower);
                    return (
                      <Link key={x.id} href={`/hp/students/${x.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.02]" style={{ textDecoration: 'none' }}>
                        <span className="w-5 shrink-0 text-[10px] text-right" style={{ color: 'rgba(255,255,255,0.25)' }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-white truncate">{x.name}</p>
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            {!scopeClass && x.cls ? `${isG8 ? 8 : 9}${x.cls}` : ''}{!scopeClass && x.cls && (x.group || pct !== null) ? ' · ' : ''}
                            {x.group ? `Group ${x.group}` : ''}{x.group && pct !== null ? ' · ' : ''}{pct !== null ? `P${pct}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-black" style={{ color: tier.color }}>{fmtValue(testObj.key as TestKey, x.val)}</p>
                          <TierPill label={tier.label}/>
                        </div>
                        {hasDelta && (
                          <span className="shrink-0 w-14 text-right text-[10px] font-black"
                            title={chg === 'stable' ? 'Within normal variation (below SWC)' : chg === 'improved' ? 'Meaningful improvement (beyond SWC)' : 'Meaningful decline (beyond SWC)'}
                            style={{ color: chg === 'improved' ? '#10b981' : chg === 'declined' ? '#f87171' : 'rgba(255,255,255,0.3)' }}>
                            {chg === 'improved' ? '▲' : chg === 'declined' ? '▼' : '≈'} {pctDelta}%
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  {sortedVals.length === 0 && (
                    <p className="px-5 py-8 text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      No results for this scope yet — record them in <Link href="/hp/testing" style={{ color: '#10b981' }}>Testing</Link>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </main>
  );
}
