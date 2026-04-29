'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

function dateLabel(value?: string | null) {
  if (!value) return 'TBC';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBC';
  return d.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 7000)
      ),
    ]);

    if (!res || typeof res !== 'object') return fallback;
    if ('error' in res && res.error) {
      console.error(res.error);
      return fallback;
    }

    return 'data' in res && res.data ? res.data : fallback;
  } catch (error) {
    console.error('Query failed:', error);
    return fallback;
  }
}

export default function PortalPage() {
  const [weekLabel, setWeekLabel] = useState('This Week');
  const [sponsors, setSponsors] = useState<Row[]>([]);
  const [weekItems, setWeekItems] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [fixtures, setFixtures] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [programs, setPrograms] = useState<Row[]>([]);
  const [gymLeaderboard, setGymLeaderboard] = useState<Row[]>([]);
  const [performanceLeaderboard, setPerformanceLeaderboard] = useState<Row[]>([]);
  const [selectedWeekItem, setSelectedWeekItem] = useState<Row | null>(null);

  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);

  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setWeekLabel(
      `${monday.toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
      })} – ${sunday.toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`
    );
  }, []);

  useEffect(() => {
    async function loadSponsors() {
      const data = await safeQuery<Row[]>(
        supabase
          .from('PortalSponsors')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .limit(6),
        []
      );
      setSponsors(data);
      setLoadingSponsors(false);
    }

    async function loadWeek() {
      const data = await safeQuery<Row[]>(
        supabase
          .from('PortalWeekPlanItems')
          .select('*')
          .order('sort_order', { ascending: true })
          .limit(20),
        []
      );
      setWeekItems(data);
      setLoadingWeek(false);
    }

    async function loadReminders() {
      const data = await safeQuery<Row[]>(
        supabase
          .from('PortalReminders')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .limit(10),
        []
      );
      setReminders(data);
      setLoadingReminders(false);
    }

    async function loadFixtures() {
      const data = await safeQuery<Row[]>(
        supabase
          .from('PortalFixtures')
          .select('*')
          .eq('is_published', true)
          .order('fixture_date', { ascending: true })
          .limit(10),
        []
      );
      setFixtures(data);
      setLoadingFixtures(false);
    }

    async function loadResults() {
      const data = await safeQuery<Row[]>(
        supabase
          .from('PortalResults')
          .select('*')
          .eq('is_published', true)
          .order('result_date', { ascending: false })
          .limit(10),
        []
      );
      setResults(data);
      setLoadingResults(false);
    }

    async function loadPrograms() {
      const data = await safeQuery<Row[]>(
        supabase
          .from('PortalPrograms')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .limit(4),
        []
      );
      setPrograms(data);
      setLoadingPrograms(false);
    }

    async function loadLeaderboards() {
      const athletes = await safeQuery<Row[]>(
        supabase.from('athletes').select('id,name,team').limit(300),
        []
      );

      const attendance = await safeQuery<Row[]>(
        supabase.from('Attendance').select('athlete_id,status,session_type').limit(1000),
        []
      );

      const performance = await safeQuery<Row[]>(
        supabase.from('Performance').select('athlete_id,test_date').limit(1000),
        []
      );

      const gym = athletes
        .map((athlete) => {
          const records = attendance.filter((r) => r.athlete_id === athlete.id);
          const total = records.length;
          const positive = records.filter((r) =>
            ['present', 'late'].includes(String(r.status).toLowerCase())
          ).length;
          const gymSessions = records.filter((r) =>
            String(r.session_type).toLowerCase() === 'gym'
          ).length;

          const attendanceRate = total ? Math.round((positive / total) * 100) : 0;
          const score = Math.round(attendanceRate * 0.7 + Math.min(gymSessions * 6, 30));

          return { ...athlete, attendanceRate, gymSessions, score };
        })
        .filter((a) => a.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const perf = athletes
        .map((athlete) => {
          const records = performance.filter((r) => r.athlete_id === athlete.id);
          const latest = [...records].sort(
            (a, b) =>
              new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
          )[0];

          const days = latest ? daysSince(latest.test_date) : null;

          const recency =
            days === null ? 0 :
            days <= 7 ? 40 :
            days <= 14 ? 30 :
            days <= 30 ? 20 : 5;

          return {
            ...athlete,
            testCount: records.length,
            days,
            score: records.length * 10 + recency,
          };
        })
        .filter((a) => a.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setGymLeaderboard(gym);
      setPerformanceLeaderboard(perf);
      setLoadingLeaderboards(false);
    }

    loadSponsors();
    loadWeek();
    loadReminders();
    loadFixtures();
    loadResults();
    loadPrograms();
    loadLeaderboards();
  }, []);

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-40 mb-5 rounded-3xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 shadow-2xl backdrop-blur md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">
                St Benedict&apos;s College
              </p>
              <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">
                Hockey Player &amp; Parent Portal
              </h1>
            </div>

            <nav className="flex flex-wrap gap-2 text-xs font-bold">
              <a href="#week" className="rounded-full bg-slate-900 px-3 py-2 text-slate-200">
                Week
              </a>
              <a href="#programs" className="rounded-full bg-slate-900 px-3 py-2 text-slate-200">
                Programs
              </a>
              <a href="#fixtures" className="rounded-full bg-slate-900 px-3 py-2 text-slate-200">
                Fixtures
              </a>
              <a href="/login" className="rounded-full bg-emerald-500 px-3 py-2 text-slate-950">
                Coach Login
              </a>
            </nav>
          </div>
        </header>

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl">
          <div className="grid grid-cols-1 gap-6 p-5 md:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                Weekly Hockey Hub
              </div>

              <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Everything for the week, clearly in one place.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Access the week at a glance, important reminders, fixtures, results, gym and mobility programs, and current leaderboards.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Week Items" value={weekItems.length} />
                <Metric label="Fixtures" value={fixtures.length} />
                <Metric label="Programs" value={programs.length} />
                <Metric label="Sponsors" value={sponsors.length} />
              </div>
            </div>

            <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-4 shadow-xl">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">
                  Sponsors
                </p>
                <h3 className="mt-2 text-2xl font-black">Supported by our partners</h3>
              </div>

              {loadingSponsors ? (
                <Empty text="Loading sponsors..." />
              ) : sponsors.length === 0 ? (
                <Empty text="Sponsor space available." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {sponsors.map((sponsor) => {
                    const tile = (
                      <div className="flex h-28 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-lg transition hover:-translate-y-0.5">
                        {sponsor.image_url ? (
                          <img
                            src={sponsor.image_url}
                            alt={sponsor.name || 'Sponsor'}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-center text-xs font-black text-slate-700">
                            {sponsor.name || 'Sponsor'}
                          </span>
                        )}
                      </div>
                    );

                    return sponsor.sponsor_link ? (
                      <a key={sponsor.id} href={sponsor.sponsor_link} target="_blank" rel="noreferrer">
                        {tile}
                      </a>
                    ) : (
                      <div key={sponsor.id}>{tile}</div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </section>

        {selectedWeekItem ? (
          <section className="mb-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                  {selectedWeekItem.day_label}
                </p>
                <h2 className="mt-2 text-2xl font-black">{selectedWeekItem.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
                  {selectedWeekItem.details || 'No extra details added yet.'}
                </p>
              </div>

              <button
                onClick={() => setSelectedWeekItem(null)}
                className="w-fit rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200"
              >
                Close
              </button>
            </div>
          </section>
        ) : null}

        <div className="space-y-6">
          <Panel id="week" title="Week at a Glance" subtitle={weekLabel}>
            {loadingWeek ? (
              <Empty text="Loading week plan..." />
            ) : weekItems.length === 0 ? (
              <Empty text="No week plan published yet." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {weekItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedWeekItem(item)}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-emerald-500/60"
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-400">
                      {item.day_label}
                    </p>
                    <h3 className="mt-2 text-sm font-black text-white">{item.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-400">
                      {item.details || 'Tap to open more information.'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Important Reminders" subtitle="Key updates for players and parents.">
            {loadingReminders ? (
              <Empty text="Loading reminders..." />
            ) : reminders.length === 0 ? (
              <Empty text="No reminders published yet." />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-sm font-black">{reminder.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-400">{reminder.details || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <section id="fixtures" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel title="Fixtures" subtitle="Upcoming matches and venues.">
              {loadingFixtures ? (
                <Empty text="Loading fixtures..." />
              ) : fixtures.length === 0 ? (
                <Empty text="No fixtures published yet." />
              ) : (
                <div className="space-y-3">
                  {fixtures.map((fixture) => (
                    <div key={fixture.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="text-sm font-black">{fixture.team} vs {fixture.opponent}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {dateLabel(fixture.fixture_date)} • {fixture.venue || 'Venue TBC'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Results" subtitle="Final scores and goal scorers.">
              {loadingResults ? (
                <Empty text="Loading results..." />
              ) : results.length === 0 ? (
                <Empty text="No results published yet." />
              ) : (
                <div className="space-y-3">
                  {results.map((result) => (
                    <div key={result.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <div>
                          <p className="text-sm font-black">{result.team} vs {result.opponent}</p>
                          <p className="mt-1 text-sm text-slate-400">{dateLabel(result.result_date)}</p>
                          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            Goal Scorers
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            {result.goal_scorers || 'Not listed'}
                          </p>
                        </div>

                        <span className="w-fit rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-200">
                          {result.final_score || '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <Panel id="programs" title="Programs" subtitle="Current gym, mobility, and recovery work.">
            {loadingPrograms ? (
              <Empty text="Loading programs..." />
            ) : programs.length === 0 ? (
              <Empty text="No programs published yet." />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {programs.map((program) => (
                  <div key={program.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                        {program.category || 'Program'}
                      </span>
                      <span className="text-xs text-slate-500">{program.day_label || '—'}</span>
                    </div>

                    <h3 className="mt-3 text-sm font-black">{program.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-slate-400">
                      {program.details || 'No details added.'}
                    </p>

                    {program.file_url ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <a
                          href={program.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-emerald-500 px-3 py-2 text-center text-xs font-black text-slate-950"
                        >
                          Open
                        </a>
                        <a
                          href={program.file_url}
                          download={program.file_name || `${program.title}.pdf`}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center text-xs font-black text-slate-200"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-slate-500">No PDF attached.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel title="Gym Leaderboard" subtitle="Based on attendance and gym participation.">
              {loadingLeaderboards ? (
                <Empty text="Loading gym leaderboard..." />
              ) : gymLeaderboard.length === 0 ? (
                <Empty text="No gym leaderboard data yet." />
              ) : (
                <Leaderboard rows={gymLeaderboard} type="gym" />
              )}
            </Panel>

            <Panel title="Performance Leaderboard" subtitle="Based on testing volume and recency.">
              {loadingLeaderboards ? (
                <Empty text="Loading performance leaderboard..." />
              ) : performanceLeaderboard.length === 0 ? (
                <Empty text="No performance data yet." />
              ) : (
                <Leaderboard rows={performanceLeaderboard} type="performance" />
              )}
            </Panel>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
      {text}
    </div>
  );
}

function Leaderboard({ rows, type }: { rows: Row[]; type: 'gym' | 'performance' }) {
  return (
    <div className="space-y-3">
      {rows.map((athlete, index) => (
        <div key={athlete.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black">
                #{index + 1} {athlete.name || 'Unknown Athlete'}
              </p>
              <p className="mt-1 text-sm text-slate-400">{athlete.team || 'Unassigned'}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-black text-sky-200">
                Score {athlete.score}
              </span>

              {type === 'gym' ? (
                <>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {athlete.gymSessions || 0} gym
                  </span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {athlete.attendanceRate || 0}%
                  </span>
                </>
              ) : (
                <>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {athlete.testCount || 0} tests
                  </span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {athlete.days === null || athlete.days === undefined
                      ? 'No date'
                      : `${athlete.days}d ago`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}