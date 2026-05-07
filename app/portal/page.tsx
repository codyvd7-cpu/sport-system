'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

function dateLabel(value?: string | null) {
  if (!value) return 'TBC';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBC';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysSince(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function safeQuery<T>(
  query: PromiseLike<{ data: T | null; error: any }>,
  fallback: T
): Promise<T> {
  try {
    const res = await Promise.race([
      query,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000)),
    ]);
    if (!res || typeof res !== 'object') return fallback;
    if ('error' in res && res.error) return fallback;
    return 'data' in res && res.data ? res.data : fallback;
  } catch {
    return fallback;
  }
}

export default function PortalPage() {
  const [sponsors, setSponsors] = useState<Row[]>([]);
  const [activeSponsorIndex, setActiveSponsorIndex] = useState(0);
  const [weekItems, setWeekItems] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [fixtures, setFixtures] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [programs, setPrograms] = useState<Row[]>([]);
  const [gymLeaderboard, setGymLeaderboard] = useState<Row[]>([]);
  const [performanceLeaderboard, setPerformanceLeaderboard] = useState<Row[]>([]);
  const [openWeekItemId, setOpenWeekItemId] = useState<string | null>(null);
  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);

  useEffect(() => {
    async function loadAll() {
      const sponsorsData = await safeQuery<Row[]>(
        supabase.from('PortalSponsors').select('*').eq('is_published', true).order('sort_order', { ascending: true }), []
      );
      const activePlanData = await safeQuery<Row[]>(
        supabase.from('PortalWeekPlan').select('id').eq('published', true).order('created_at', { ascending: false }).limit(1), []
      );
      const activePlanId = activePlanData[0]?.id ?? null;
      const weekData = activePlanId
        ? await safeQuery<Row[]>(supabase.from('PortalWeekPlanItems').select('*').eq('week_plan_id', activePlanId).order('sort_order', { ascending: true }), [])
        : [];
      const remindersData = await safeQuery<Row[]>(
        supabase.from('PortalReminders').select('*').eq('is_published', true).order('sort_order', { ascending: true }), []
      );
      const fixturesData = await safeQuery<Row[]>(
        supabase.from('PortalFixtures').select('*').eq('is_published', true).order('fixture_date', { ascending: true }), []
      );
      const resultsData = await safeQuery<Row[]>(
        supabase.from('PortalResults').select('*').eq('is_published', true).order('result_date', { ascending: false }), []
      );
      const programsData = await safeQuery<Row[]>(
        supabase.from('PortalPrograms').select('*').eq('is_published', true).order('sort_order', { ascending: true }), []
      );
      const athletes = await safeQuery<Row[]>(supabase.from('athletes').select('id,name,team').limit(300), []);
      const attendance = await safeQuery<Row[]>(supabase.from('Attendance').select('athlete_id,status,session_type').limit(1000), []);
      const performance = await safeQuery<Row[]>(supabase.from('Performance').select('athlete_id,test_date').limit(1000), []);

      const gym = athletes.map((athlete) => {
        const records = attendance.filter((r) => r.athlete_id === athlete.id);
        const total = records.length;
        const positive = records.filter((r) => ['present', 'late'].includes(String(r.status).toLowerCase())).length;
        const gymSessions = records.filter((r) => String(r.session_type).toLowerCase() === 'gym').length;
        const attendanceRate = total ? Math.round((positive / total) * 100) : 0;
        const score = Math.round(attendanceRate * 0.7 + Math.min(gymSessions * 6, 30));
        return { ...athlete, attendanceRate, gymSessions, score };
      }).filter((a) => a.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

      const perf = athletes.map((athlete) => {
        const records = performance.filter((r) => r.athlete_id === athlete.id);
        const latest = [...records].sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];
        const days = latest ? daysSince(latest.test_date) : null;
        const recency = days === null ? 0 : days <= 7 ? 40 : days <= 14 ? 30 : days <= 30 ? 20 : 5;
        return { ...athlete, testCount: records.length, days, score: records.length * 10 + recency };
      }).filter((a) => a.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

      setSponsors(sponsorsData);
      setWeekItems(weekData);
      setReminders(remindersData);
      setFixtures(fixturesData);
      setResults(resultsData);
      setPrograms(programsData.slice(0, 4));
      setGymLeaderboard(gym);
      setPerformanceLeaderboard(perf);
      setLoadingSponsors(false);
      setLoadingWeek(false);
      setLoadingReminders(false);
      setLoadingFixtures(false);
      setLoadingResults(false);
      setLoadingPrograms(false);
      setLoadingLeaderboards(false);
    }
    loadAll();
  }, []);

  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSponsorIndex((i) => (i + 1) % sponsors.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [sponsors]);

  const activeSponsor = sponsors[activeSponsorIndex];
  const MEDALS = ['🥇', '🥈', '🥉', '', ''];

  return (
    <main className="min-h-screen bg-[#06071a] text-white">

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1022] to-[#06071a]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(14,165,233,0.08),transparent)]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">

          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-white/5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🏑</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-400">St Benedict's College</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-600">Hockey Department</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Live</span>
            </div>
          </div>

          {/* Two column: heading + sponsor card */}
          <div className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">

            {/* Left — Heading */}
            <div>
              <h1 className="text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
                Player &amp; Parent<br />
                <span className="bg-gradient-to-r from-sky-400 via-sky-300 to-sky-500 bg-clip-text text-transparent">Portal.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-500 sm:text-base">
                Weekly plans, fixtures, results, programs and department updates — all in one place.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {['This Week', 'Fixtures', 'Results', 'Programs', 'Reminders'].map((label) => (
                  <a key={label} href={`#${label.toLowerCase().replace(' ', '')}`}
                    className="rounded-full border border-white/8 bg-white/4 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-white">
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Right — Sponsor card (original style) */}
            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-400">Sponsors</p>
              <h2 className="mt-2 text-xl font-black">Supported by our partners</h2>
              <div className="mt-4">
                {loadingSponsors ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">Loading sponsors...</div>
                ) : sponsors.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">Sponsor space available.</div>
                ) : (
                  <>
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                      <div className="flex h-40 items-center justify-center bg-white px-6 py-5 sm:h-44 sm:px-8 sm:py-6">
                        {activeSponsor?.image_url ? (
                          <img
                            src={activeSponsor.image_url}
                            alt={activeSponsor.name || 'Sponsor'}
                            className="block max-h-24 w-auto max-w-[80%] object-contain sm:max-h-28 sm:max-w-[85%]"
                            style={{ mixBlendMode: 'multiply' }}
                          />
                        ) : (
                          <p className="text-center text-lg font-black text-slate-700">{activeSponsor?.name || 'Sponsor'}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-black text-slate-200">{activeSponsor?.name || 'Sponsor'}</p>
                      <div className="flex gap-1.5">
                        {sponsors.map((_: Row, i: number) => (
                          <button key={i} onClick={() => setActiveSponsorIndex(i)}
                            className={`h-2.5 rounded-full transition-all ${i === activeSponsorIndex ? 'w-7 bg-emerald-400' : 'w-2.5 bg-slate-700'}`}
                            aria-label={`Show sponsor ${i + 1}`} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── CONTENT ──────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">

        {/* ── WEEK AT A GLANCE ─────────────────────────── */}
        <section id="thisweek" className="mb-16 scroll-mt-8">
          <Label text="This Week" />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Week at a Glance</h2>
          <p className="mt-2 text-sm text-slate-500">Tap any day to expand the full session plan.</p>
          <div className="mt-6">
            {loadingWeek ? <Skeleton /> : weekItems.length === 0 ? <Empty text="No week plan published yet." /> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {weekItems.map((item: Row) => {
                  const itemId = String(item.id);
                  const isOpen = openWeekItemId === itemId;
                  return (
                    <button key={item.id} type="button" onClick={() => setOpenWeekItemId(isOpen ? null : itemId)}
                      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
                        isOpen ? 'border-sky-500/50 bg-gradient-to-br from-sky-500/10 to-sky-500/5 shadow-xl shadow-sky-500/10'
                          : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/6'
                      }`}>
                      <div className={`absolute right-0 top-0 h-16 w-16 rounded-bl-3xl ${isOpen ? 'bg-sky-500/15' : 'bg-white/3'}`} />
                      <div className="p-5">
                        <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black ${
                          isOpen ? 'bg-sky-500 text-white' : 'bg-white/8 text-slate-400'
                        }`}>
                          {(item.day_label || 'D').slice(0, 2).toUpperCase()}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isOpen ? 'text-sky-400' : 'text-slate-600'}`}>
                          {item.day_label || 'Day'}
                        </p>
                        <p className="mt-1.5 text-sm font-black text-white">{item.title || 'Session'}</p>
                        <p className={`mt-2 text-xs leading-5 ${isOpen ? 'text-slate-300' : 'line-clamp-2 text-slate-600'}`}>
                          {item.details || 'Tap for details.'}
                        </p>
                        {!isOpen && (
                          <p className="mt-3 text-[10px] font-black text-sky-600 transition group-hover:text-sky-500">EXPAND →</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── FIXTURES ─────────────────────────────────── */}
        <section id="fixtures" className="mb-16 scroll-mt-8">
          <Label text="Schedule" />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Fixtures</h2>
          <p className="mt-2 text-sm text-slate-500">Upcoming matches and venues.</p>
          <div className="mt-6">
            {loadingFixtures ? <Skeleton /> : fixtures.length === 0 ? <Empty text="No fixtures published yet." /> : (
              <div className="space-y-3">
                {fixtures.map((fixture: Row) => (
                  <div key={fixture.id} className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-5 transition hover:border-sky-500/20 hover:bg-sky-500/5">
                    <div className="flex items-center gap-5">
                      <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-center">
                        <p className="text-xl font-black leading-none text-white">
                          {fixture.fixture_date ? new Date(fixture.fixture_date).toLocaleDateString('en-ZA', { day: 'numeric' }) : '—'}
                        </p>
                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                          {fixture.fixture_date ? new Date(fixture.fixture_date).toLocaleDateString('en-ZA', { month: 'short' }) : ''}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-sky-300">
                            {fixture.team || 'TBC'}
                          </span>
                          {fixture.fixture_time && (
                            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                              {fixture.fixture_time}
                            </span>
                          )}
                        </div>
                        <p className="text-base font-black text-white">vs <span className="text-slate-300">{fixture.opponent || 'Opponent TBC'}</span></p>
                        {fixture.venue && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 shrink-0">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                            </svg>
                            {fixture.venue}
                          </p>
                        )}
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-slate-700 transition group-hover:text-sky-500">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── RESULTS ──────────────────────────────────── */}
        <section id="results" className="mb-16 scroll-mt-8">
          <Label text="Latest" />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Results</h2>
          <p className="mt-2 text-sm text-slate-500">Recent match outcomes and scorers.</p>
          <div className="mt-6">
            {loadingResults ? <Skeleton /> : results.length === 0 ? <Empty text="No results published yet." /> : (
              <div className="space-y-3">
                {results.map((result: Row) => {
                  const score = result.final_score || '';
                  const parts = score.split(/[-–]/);
                  const our = parseInt(parts[0]) || 0;
                  const their = parseInt(parts[1]) || 0;
                  const won = parts.length === 2 && our > their;
                  const drew = parts.length === 2 && our === their;
                  const outcome = won ? 'WIN' : drew ? 'DRAW' : score ? 'LOSS' : '—';
                  return (
                    <div key={result.id} className={`overflow-hidden rounded-2xl border ${
                      won ? 'border-emerald-500/25 bg-gradient-to-r from-emerald-500/8 to-transparent'
                        : drew ? 'border-white/8 bg-white/3'
                        : 'border-red-500/20 bg-gradient-to-r from-red-500/6 to-transparent'
                    }`}>
                      <div className="flex items-stretch">
                        <div className={`flex w-16 shrink-0 flex-col items-center justify-center py-5 text-center ${
                          won ? 'bg-emerald-500/15' : drew ? 'bg-white/5' : 'bg-red-500/12'
                        }`}>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${
                            won ? 'text-emerald-400' : drew ? 'text-slate-400' : 'text-red-400'
                          }`}>{outcome}</p>
                          <p className={`mt-1 text-xl font-black leading-none ${
                            won ? 'text-emerald-300' : drew ? 'text-slate-300' : 'text-red-300'
                          }`}>{score || '—'}</p>
                        </div>
                        <div className="flex-1 p-5">
                          <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                            {result.team || 'Team'}
                          </span>
                          <p className="mt-2 text-base font-black text-white">vs {result.opponent || 'TBC'}</p>
                          <p className="mt-1 text-xs text-slate-500">{dateLabel(result.result_date)}</p>
                          {result.goal_scorers && (
                            <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                              <span>⚽</span><span>{result.goal_scorers}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── PROGRAMS ─────────────────────────────────── */}
        <section id="programs" className="mb-16 scroll-mt-8">
          <Label text="Training" />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Programs</h2>
          <p className="mt-2 text-sm text-slate-500">Current gym, mobility and recovery work.</p>
          <div className="mt-6">
            {loadingPrograms ? <Skeleton /> : programs.length === 0 ? <Empty text="No programs published yet." /> : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {programs.map((program: Row) => {
                  const catColors: Record<string, string> = {
                    Gym: 'from-violet-500/20 to-violet-500/5 border-violet-500/25',
                    Mobility: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/25',
                    Recovery: 'from-sky-500/20 to-sky-500/5 border-sky-500/25',
                  };
                  const gradient = catColors[program.category] || 'from-white/8 to-white/3 border-white/8';
                  return (
                    <div key={program.id} className={`flex flex-col rounded-2xl border bg-gradient-to-br p-5 ${gradient}`}>
                      {program.category && (
                        <span className="mb-4 inline-block w-fit rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                          {program.category}
                        </span>
                      )}
                      <p className="text-sm font-black text-white">{program.title}</p>
                      <p className="mt-2 flex-1 text-xs leading-5 text-slate-400">{program.details || 'No details added.'}</p>
                      {program.file_url ? (
                        <div className="mt-5 flex gap-2">
                          <a href={program.file_url} target="_blank" rel="noreferrer"
                            className="flex-1 rounded-xl bg-white/10 py-2.5 text-center text-xs font-black text-white transition hover:bg-white/15">
                            Open PDF
                          </a>
                          <a href={program.file_url} download={program.file_name || `${program.title}.pdf`}
                            className="flex-1 rounded-xl bg-white/5 py-2.5 text-center text-xs font-black text-slate-300 transition hover:bg-white/10">
                            Download
                          </a>
                        </div>
                      ) : (
                        <p className="mt-4 text-[10px] text-slate-600">No PDF attached.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── REMINDERS ────────────────────────────────── */}
        <section id="reminders" className="mb-16 scroll-mt-8">
          <Label text="Notices" />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Reminders</h2>
          <p className="mt-2 text-sm text-slate-500">Key updates from the hockey department.</p>
          <div className="mt-6">
            {loadingReminders ? <Skeleton /> : reminders.length === 0 ? <Empty text="No reminders published yet." /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {reminders.map((reminder: Row) => (
                  <div key={reminder.id} className="flex gap-4 overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/8 to-transparent p-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-amber-400">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">{reminder.title}</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-400">{reminder.details || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── LEADERBOARDS ─────────────────────────────── */}
        <section id="leaderboards" className="mb-8 scroll-mt-8">
          <Label text="Rankings" />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Leaderboards</h2>
          <p className="mt-2 text-sm text-slate-500">Top performers across the squad.</p>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {[
              { title: 'Gym & Attendance', data: gymLeaderboard, type: 'gym' },
              { title: 'Performance Testing', data: performanceLeaderboard, type: 'perf' },
            ].map((board) => (
              <div key={board.title}>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-600">{board.title}</p>
                {loadingLeaderboards ? <Skeleton /> : board.data.length === 0 ? <Empty text="No data yet." /> : (
                  <div className="space-y-2">
                    {board.data.map((athlete: Row, i: number) => (
                      <div key={athlete.id} className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
                        i === 0 ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent'
                          : 'border-white/6 bg-white/3'
                      }`}>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-lg">
                          {MEDALS[i] || <span className="text-sm font-black text-slate-500">{i + 1}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{athlete.name}</p>
                          <p className="truncate text-xs text-slate-500">{athlete.team}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-black text-white">{athlete.score}</p>
                          <p className="text-[10px] text-slate-600">
                            {board.type === 'gym' ? `${athlete.attendanceRate}% att` : athlete.days === null ? 'No tests' : `${athlete.days}d ago`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#030410] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-2xl">🏑</span>
            <p className="text-sm font-black text-white">St Benedict's College Hockey</p>
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} — Built for excellence</p>
          </div>
        </div>
      </footer>

    </main>
  );
}

function Label({ text }: { text: string }) {
  return (
    <span className="inline-block rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-sky-400">
      {text}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/3 p-5">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      <p className="text-sm text-slate-600">Loading...</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-5 text-sm text-slate-600">{text}</div>
  );
}