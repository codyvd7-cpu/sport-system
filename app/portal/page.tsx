'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';
import { SPORTS, type SportKey } from '@/lib/sports';

type Row = Record<string, any>;

// Sport config for portal branding
const SPORT_CONFIG: Record<string, {
  label: string; color: string; accent: string;
  colorDim: string; accentBorder: string; gradient: string; spinner: string;
}> = {
  hockey:    { label: 'Hockey',     color: '#38bdf8', accent: 'rgba(56,189,248,0.15)',  colorDim: 'rgba(56,189,248,0.1)',  accentBorder: 'rgba(56,189,248,0.3)',  gradient: 'from-sky-400 via-sky-300 to-sky-500',   spinner: 'border-sky-500' },
  rugby:     { label: 'Rugby',      color: '#f87171', accent: 'rgba(248,113,113,0.15)', colorDim: 'rgba(248,113,113,0.1)', accentBorder: 'rgba(248,113,113,0.3)', gradient: 'from-red-400 via-red-300 to-red-500',   spinner: 'border-red-500' },
  cricket:   { label: 'Cricket',    color: '#fbbf24', accent: 'rgba(251,191,36,0.15)',  colorDim: 'rgba(251,191,36,0.1)',  accentBorder: 'rgba(251,191,36,0.3)',  gradient: 'from-amber-400 via-amber-300 to-amber-500', spinner: 'border-amber-500' },
  rowing:    { label: 'Rowing',     color: '#34d399', accent: 'rgba(52,211,153,0.15)',  colorDim: 'rgba(52,211,153,0.1)',  accentBorder: 'rgba(52,211,153,0.3)',  gradient: 'from-emerald-400 via-emerald-300 to-emerald-500', spinner: 'border-emerald-500' },
  swimming:  { label: 'Swimming',   color: '#818cf8', accent: 'rgba(129,140,248,0.15)', colorDim: 'rgba(129,140,248,0.1)', accentBorder: 'rgba(129,140,248,0.3)', gradient: 'from-violet-400 via-violet-300 to-violet-500', spinner: 'border-violet-500' },
  waterpolo: { label: 'Water Polo', color: '#06b6d4', accent: 'rgba(6,182,212,0.15)',   colorDim: 'rgba(6,182,212,0.1)',   accentBorder: 'rgba(6,182,212,0.3)',   gradient: 'from-cyan-400 via-cyan-300 to-cyan-500', spinner: 'border-cyan-500' },
};

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

function PortalInner() {
  const searchParams = useSearchParams();
  const sport = (searchParams.get('sport') ||
    (typeof document !== 'undefined'
      ? document.cookie.split(';').find(c => c.trim().startsWith('portal_sport='))?.split('=')[1]
      : null) || 'hockey') as SportKey;
  const sportCfg = SPORT_CONFIG[sport] || SPORT_CONFIG.hockey;

  const [sponsors, setSponsors] = useState<Row[]>([]);
  const [activeSponsorIndex, setActiveSponsorIndex] = useState(0);
  const [weekItems, setWeekItems] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [fixtures, setFixtures] = useState<Row[]>([]);
  const [expandedFixtureDate, setExpandedFixtureDate] = useState<string | null>(null);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
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
        supabase.from('portal_sponsors').select('*').eq('is_published', true).eq('sport', sport).order('sort_order', { ascending: true }), []
      );
      const activePlanData = await safeQuery<Row[]>(
        supabase.from('portal_week_plans').select('id').eq('published', true).eq('sport', sport).order('created_at', { ascending: false }).limit(1), []
      );
      const activePlanId = activePlanData[0]?.id ?? null;
      const weekData = activePlanId
        ? await safeQuery<Row[]>(supabase.from('portal_week_plan_items').select('*').eq('week_plan_id', activePlanId).order('sort_order', { ascending: true }), [])
        : [];
      const remindersData = await safeQuery<Row[]>(
        supabase.from('portal_reminders').select('*').eq('is_published', true).eq('sport', sport).order('sort_order', { ascending: true }), []
      );
      const fixturesData = await safeQuery<Row[]>(
        supabase.from('portal_fixtures').select('*').eq('is_published', true).eq('sport', sport).order('fixture_date', { ascending: true }), []
      );
      const resultsData = await safeQuery<Row[]>(
        supabase.from('portal_results').select('*').eq('is_published', true).eq('sport', sport).order('result_date', { ascending: false }), []
      );
      const programsData = await safeQuery<Row[]>(
        supabase.from('portal_programs').select('*').eq('is_published', true).eq('sport', sport).order('sort_order', { ascending: true }), []
      );
      // Fetch leaderboard data via API route (bypasses RLS)
      const lbRes = await fetch(`/api/portal/leaderboard?sport=${sport}`);
      const lbData = lbRes.ok ? await lbRes.json() : { athletes: [], attendance: [], performance: [] };
      const athletes: Row[] = lbData.athletes || [];
      const attendance: Row[] = lbData.attendance || [];
      const performance: Row[] = lbData.performance || [];

      const gym = athletes.map((athlete) => {
        const records = attendance.filter((r) => r.athlete_id === athlete.id);
        const total = records.length;
        const positive = records.filter((r) => ['present', 'late'].includes(String(r.status).toLowerCase())).length;
        const gymSessions = records.filter((r) => String(r.session_type).toLowerCase() === 'gym').length;
        const attendanceRate = total ? Math.round((positive / total) * 100) : 0;
        const score = Math.round(attendanceRate * 0.7 + Math.min(gymSessions * 6, 30));
        return { ...athlete, name: athlete.firstName || 'Athlete', attendanceRate, gymSessions, score };
      }).filter((a) => a.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

      const perf = athletes.map((athlete) => {
        const records = performance.filter((r) => r.athlete_id === athlete.id);
        const latest = [...records].sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];
        const days = latest ? daysSince(latest.test_date) : null;
        const recency = days === null ? 0 : days <= 7 ? 40 : days <= 14 ? 30 : days <= 30 ? 20 : 5;
        return { ...athlete, name: athlete.firstName || 'Athlete', testCount: records.length, days, score: records.length * 10 + recency };
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
  const MEDALS = ['1st', '2nd', '3rd', '4th', '5th'];

  return (
    <main className="min-h-screen bg-[#06071a] text-white">

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1022] to-[#06071a]" />
        <div style={{background:`linear-gradient(90deg,transparent,${sportCfg.color}66,transparent)`,height:1}} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(14,165,233,0.08),transparent)]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">

          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-white/5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl"></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em]" style={{color:sportCfg.color}}>St Benedict's College</p>
                <p className="text-[10px] uppercase tracking-widest" style={{color:sportCfg.color}}>{sportCfg.label} Department</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href="/" className="rounded-full border border-white/8/50 bg-[rgba(255,255,255,0.025)] px-3 py-1.5 text-xs font-black text-white/35 transition hover:text-white/70">← Departments</a>
              <a href={`/login?sport=${sport}`} className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs font-black text-white/70 transition hover:text-white">Coach Login</a>
              <a href="/player" className="rounded-full border px-3 py-1.5 text-xs font-black transition" style={{borderColor:sportCfg.accentBorder,background:sportCfg.colorDim,color:sportCfg.color}}>Player Login</a>
            </div>
          </div>

          {/* Two column: heading + sponsor card */}
          <div className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">

            {/* Left — Heading */}
            <div>
              <h1 className="text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
                Player &amp; Parent<br />
                <span style={{background:`linear-gradient(90deg,${sportCfg.color},white,${sportCfg.color})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Portal.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/35 sm:text-base">
                Weekly plans, fixtures, results, programs and department updates — all in one place.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {['This Week', 'Fixtures', 'Results', 'Programs', 'Reminders'].map((label) => (
                  <a key={label} href={`#${label.toLowerCase().replace(' ', '')}`}
                    className="rounded-full border border-white/8 bg-white/4 px-4 py-2 text-xs font-semibold text-white/50 transition hover:text-white" style={{}} onMouseEnter={e=>{e.currentTarget.style.borderColor=sportCfg.accentBorder;e.currentTarget.style.background=sportCfg.colorDim;}} onMouseLeave={e=>{e.currentTarget.style.borderColor="";e.currentTarget.style.background="";}}>
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Right — Sponsor card (original style) */}
            <div className="rounded-[1.5rem] border border-white/6 bg-[rgba(255,255,255,0.01)]/70 p-4 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-400">Sponsors</p>
              <h2 className="mt-2 text-xl font-black">Supported by our partners</h2>
              <div className="mt-4">
                {loadingSponsors ? (
                  <div className="rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.01)]/60 p-4 text-sm text-white/50">Loading sponsors...</div>
                ) : sponsors.length === 0 ? (
                  <div className="rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.01)]/60 p-4 text-sm text-white/50">Sponsor space available.</div>
                ) : (
                  <>
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                      <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-white p-4 sm:h-48">
                        {activeSponsor?.image_url ? (
                          <img
                            src={activeSponsor.image_url}
                            alt={activeSponsor.name || 'Sponsor'}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <p className="text-center text-lg font-black text-white/15">{activeSponsor?.name || 'Sponsor'}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-black text-white/85">{activeSponsor?.name || 'Sponsor'}</p>
                      <div className="flex gap-1.5">
                        {sponsors.map((_: Row, i: number) => (
                          <button key={i} onClick={() => setActiveSponsorIndex(i)}
                            className={`h-2.5 rounded-full transition-all ${i === activeSponsorIndex ? 'w-7 bg-emerald-400' : 'w-2.5 bg-white/8'}`}
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
          <Label text="This Week" color={sportCfg.color} />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Week at a Glance</h2>
          <p className="mt-2 text-sm text-white/35">Tap any day to expand the full session plan.</p>
          <div className="mt-6">
            {loadingWeek ? <Skeleton color={sportCfg.color} /> : weekItems.length === 0 ? <Empty text="No week plan published yet." /> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {weekItems.map((item: Row) => {
                  const itemId = String(item.id);
                  const isOpen = openWeekItemId === itemId;
                  return (
                    <button key={item.id} type="button" onClick={() => setOpenWeekItemId(isOpen ? null : itemId)}
                      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
                        isOpen ? 'border-white/15 shadow-xl' : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/6'
                      }`}
                      style={isOpen ? {background:`linear-gradient(135deg,${sportCfg.colorDim},transparent)`} : undefined}>
                      <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-3xl" style={{background:isOpen?sportCfg.colorDim:'rgba(255,255,255,0.03)'}} />
                      <div className="p-5">
                        <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black ${
                          isOpen ? 'bg-white/10 text-white' : 'bg-white/8 text-white/50'
                        }`}>
                          {(item.day_label || 'D').slice(0, 2).toUpperCase()}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isOpen ? 'text-white' : 'text-white/25'}`}>
                          {item.day_label || 'Day'}
                        </p>
                        <p className="mt-1.5 text-sm font-black text-white">{item.title || 'Session'}</p>
                        <p className={`mt-2 text-xs leading-5 ${isOpen ? 'text-white/70' : 'line-clamp-2 text-white/25'}`}>
                          {item.details || 'Tap for details.'}
                        </p>
                        {!isOpen && (
                          <p className="mt-3 text-[10px] font-black transition">EXPAND →</p>
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
          <Label text="Schedule" color={sportCfg.color} />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Fixtures</h2>
          <p className="mt-2 text-sm text-white/35">Upcoming matches and venues.</p>
          <div className="mt-6">
            {loadingFixtures ? <Skeleton color={sportCfg.color} /> : fixtures.length === 0 ? <Empty text="No fixtures published yet." /> : (
              <div className="space-y-3">
                {Array.from(new Set(fixtures.map((f: Row) => f.fixture_date))).sort().map((date) => {
                  const dayFixtures = fixtures.filter((f: Row) => f.fixture_date === date);
                  const isExpanded = expandedFixtureDate === date;
                  const d = new Date(date as string);
                  return (
                    <div key={date as string} className="overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition hover:border-white/15">
                      <button onClick={() => setExpandedFixtureDate(isExpanded ? null : date as string)}
                        className="flex w-full items-center gap-5 p-5 text-left">
                        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-center">
                          <p className="text-xl font-black leading-none text-white">{d.getDate()}</p>
                          <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-white/35">{d.toLocaleDateString('en-ZA', { month: 'short' })}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black uppercase tracking-wide text-white/35 mb-1">{d.toLocaleDateString('en-ZA', { weekday: 'long' })}</p>
                          <p className="text-base font-black text-white">{dayFixtures.length} {dayFixtures.length === 1 ? 'match' : 'matches'}</p>
                          <p className="mt-0.5 text-xs text-white/35">{dayFixtures.map((f: Row) => f.team).join(' · ')}</p>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                          className={`h-4 w-4 shrink-0 text-white/35 transition ${isExpanded ? 'rotate-90 ' : ''}`}>
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-white/5 px-5 pb-4 pt-3 space-y-2">
                          {dayFixtures.map((fixture: Row) => (
                            <div key={fixture.id} className="rounded-xl border border-white/5 bg-white/3 p-3">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="rounded-full px-2.5 py-1 text-[10px] font-black">{fixture.team}</span>
                                {fixture.fixture_time && <span className="text-[10px] text-white/35">{fixture.fixture_time}</span>}
                              </div>
                              <p className="text-sm font-black text-white">vs {fixture.opponent}</p>
                              {fixture.venue && <p className="mt-0.5 text-xs text-white/35">{fixture.venue}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── RESULTS ──────────────────────────────────── */}
        <section id="results" className="mb-16 scroll-mt-8">
          <Label text="Latest" color={sportCfg.color} />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Results</h2>
          <p className="mt-2 text-sm text-white/35">Recent match outcomes and scorers.</p>
          <div className="mt-6">
            {loadingResults ? <Skeleton color={sportCfg.color} /> : results.length === 0 ? <Empty text="No results published yet." /> : (
              <div className="space-y-3">
                {Array.from(new Set(results.map((r: Row) => r.result_date))).sort().reverse().map((date) => {
                  const dayResults = results.filter((r: Row) => r.result_date === date);
                  const isExpanded = expandedResultId === date;
                  const wins = dayResults.filter((r: Row) => { const p = (r.final_score||'').split(/[-–]/); return p.length===2 && parseInt(p[0])>parseInt(p[1]); }).length;
                  const losses = dayResults.filter((r: Row) => { const p = (r.final_score||'').split(/[-–]/); return p.length===2 && parseInt(p[0])<parseInt(p[1]); }).length;
                  const draws = dayResults.filter((r: Row) => { const p = (r.final_score||'').split(/[-–]/); return p.length===2 && parseInt(p[0])===parseInt(p[1]); }).length;
                  return (
                    <div key={date as string} className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
                      <button onClick={() => setExpandedResultId(isExpanded ? null : date as string)}
                        className="flex w-full items-center gap-5 p-5 text-left">
                        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-center">
                          <p className="text-xl font-black leading-none text-white">{new Date(date as string).getDate()}</p>
                          <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-white/35">{new Date(date as string).toLocaleDateString('en-ZA', { month: 'short' })}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-white/35 mb-1">{new Date(date as string).toLocaleDateString('en-ZA', { weekday: 'long' })}</p>
                          <p className="text-base font-black text-white">{dayResults.length} {dayResults.length === 1 ? 'match' : 'matches'}</p>
                          <div className="flex gap-3 mt-1">
                            {wins > 0 && <span className="text-[10px] font-black text-emerald-400">{wins}W</span>}
                            {draws > 0 && <span className="text-[10px] font-black text-white/50">{draws}D</span>}
                            {losses > 0 && <span className="text-[10px] font-black text-red-400">{losses}L</span>}
                          </div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                          className={`h-4 w-4 shrink-0 text-white/35 transition ${isExpanded ? 'rotate-90 ' : ''}`}>
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-white/5 px-5 pb-4 pt-3 space-y-2">
                          {dayResults.map((result: Row) => {
                            const score = result.final_score || '';
                            const parts = score.split(/[-–]/);
                            const our = parseInt(parts[0]) || 0;
                            const their = parseInt(parts[1]) || 0;
                            const won = parts.length === 2 && our > their;
                            const drew = parts.length === 2 && our === their;
                            const outcome = won ? 'WIN' : drew ? 'DRAW' : score ? 'LOSS' : '—';
                            return (
                              <div key={result.id} className={`flex items-center gap-3 rounded-xl border p-3 ${won ? 'border-emerald-500/20 bg-emerald-500/5' : drew ? 'border-white/5 bg-white/3' : 'border-red-500/15 bg-red-500/5'}`}>
                                <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${won ? 'bg-emerald-500/20 text-emerald-300' : drew ? 'bg-white/10 text-white/50' : 'bg-red-500/20 text-red-300'}`}>{outcome}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black text-white">{result.team} vs {result.opponent}</p>
                                  <p className="text-xs text-white/35">{score}</p>
                                  {result.goal_scorers && <p className="text-[10px] text-white/35 mt-0.5">{result.goal_scorers}</p>}
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
          </div>
        </section>

        {/* ── PROGRAMS ─────────────────────────────────── */}
        <section id="programs" className="mb-16 scroll-mt-8">
          <Label text="Training" color={sportCfg.color} />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Programs</h2>
          <p className="mt-2 text-sm text-white/35">Current gym, mobility and recovery work.</p>
          <div className="mt-6">
            {loadingPrograms ? <Skeleton color={sportCfg.color} /> : programs.length === 0 ? <Empty text="No programs published yet." /> : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {programs.map((program: Row) => {
                  const catColors: Record<string, string> = {
                    Gym: 'from-violet-500/20 to-violet-500/5 border-violet-500/25',
                    Mobility: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/25',
                    Recovery: 'from-white/10 to-white/5 border-white/15',
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
                      <p className="mt-2 flex-1 text-xs leading-5 text-white/50">{program.details || 'No details added.'}</p>
                      {program.file_url ? (
                        <div className="mt-5 flex gap-2">
                          <a href={program.file_url} target="_blank" rel="noreferrer"
                            className="flex-1 rounded-xl bg-white/10 py-2.5 text-center text-xs font-black text-white transition hover:bg-white/15">
                            Open PDF
                          </a>
                          <a href={program.file_url} download={program.file_name || `${program.title}.pdf`}
                            className="flex-1 rounded-xl bg-white/5 py-2.5 text-center text-xs font-black text-white/70 transition hover:bg-white/10">
                            Download
                          </a>
                        </div>
                      ) : (
                        <p className="mt-4 text-[10px] text-white/25">No PDF attached.</p>
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
          <Label text="Notices" color={sportCfg.color} />
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Reminders</h2>
          <p className="mt-2 text-sm text-white/35">Key updates from the hockey department.</p>
          <div className="mt-6">
            {loadingReminders ? <Skeleton color={sportCfg.color} /> : reminders.length === 0 ? <Empty text="No reminders published yet." /> : (
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
                      <p className="mt-1.5 text-xs leading-5 text-white/50">{reminder.details || '—'}</p>
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
          <p className="mt-2 text-sm text-white/35">Top performers across the squad.</p>

          <div className="mt-6 grid gap-8 xl:grid-cols-2">
            {[
              { title: 'Gym & Attendance', sub: 'Sessions attended this season', data: gymLeaderboard, type: 'gym', accent: sportCfg.color },
              { title: 'Performance Testing', sub: 'Fitness test scores', data: performanceLeaderboard, type: 'perf', accent: '#a78bfa' },
            ].map((board) => (
              <div key={board.title}>
                {/* Board header */}
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{color:board.accent}}>{board.title}</p>
                    <p className="text-[11px] text-white/25 mt-0.5">{board.sub}</p>
                  </div>
                </div>

                {loadingLeaderboards ? <Skeleton color={sportCfg.color} /> : board.data.length === 0 ? <Empty text="No data yet." /> : (
                  <div className="space-y-2">
                    {board.data.slice(0,3).map((athlete: Row, i: number) => {
                      const podiumColors = [
                        {bg:'rgba(251,191,36,0.08)',border:'rgba(251,191,36,0.2)',rank:'#fbbf24',rankBg:'rgba(251,191,36,0.15)'},
                        {bg:'rgba(148,163,184,0.06)',border:'rgba(148,163,184,0.15)',rank:'#94a3b8',rankBg:'rgba(148,163,184,0.1)'},
                        {bg:'rgba(180,120,60,0.06)',border:'rgba(180,120,60,0.15)',rank:'#b45a1f',rankBg:'rgba(180,120,60,0.1)'},
                      ];
                      const p = podiumColors[i];
                      const rankLabels = ['1st','2nd','3rd'];
                      return(
                        <div key={athlete.id} className="flex items-center gap-4 rounded-2xl border p-4 transition"
                          style={{background:p.bg,borderColor:p.border}}>
                          {/* Rank badge */}
                          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl"
                            style={{background:p.rankBg}}>
                            <span className="text-[9px] font-black uppercase" style={{color:p.rank}}>{rankLabels[i]}</span>
                          </div>
                          {/* Avatar */}
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-[11px] font-black text-white">
                            {(athlete.name||'?').split(' ')[0]?.[0]?.toUpperCase()||'?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-white">
                              {(athlete.name||'').split(' ')[0]||'Athlete'}
                            </p>
                            <p className="text-[11px] text-white/35">{athlete.team}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xl font-black" style={{color:board.accent}}>{athlete.score}</p>
                            <p className="text-[10px] text-white/25">
                              {board.type==='gym'?`${athlete.attendanceRate}% att`:athlete.days===null?'No tests':`${athlete.days}d ago`}
                            </p>
                          </div>
                        </div>
                      );
                    })}

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
            <p className="text-sm font-black text-white">St Benedict's College {sportCfg.label}</p>
            <p className="text-xs text-white/25">© {new Date().getFullYear()} — Built for excellence</p>
            <p className="text-[10px] text-white/15">
              <a href="/privacy" className="hover:text-white/35 transition-colors">Privacy Policy</a>
              <span className="mx-2">·</span>
              <a href="/terms" className="hover:text-white/35 transition-colors">Terms of Use</a>
            </p>
          </div>
        </div>
      </footer>
</main>
  );
}

function Label({ text, color = '#38bdf8' }: { text: string; color?: string }) {
  return (
    <span className="inline-block rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em]"
      style={{borderColor:`${color}50`,background:`${color}18`,color}}>
      {text}
    </span>
  );
}

function Skeleton({ color = '#38bdf8' }: { color?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/3 p-5">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
        style={{borderColor:`${color} transparent transparent transparent`}} />
      <p className="text-sm text-white/25">Loading...</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-5 text-sm text-white/25">{text}</div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#030810'}}/>}>
      <PortalInner />
    </Suspense>
  );
}
