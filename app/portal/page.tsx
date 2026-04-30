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
        supabase
          .from('PortalSponsors')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true }),
        []
      );

      const weekData = await safeQuery<Row[]>(
        supabase
          .from('PortalWeekPlanItems')
          .select('*')
          .order('sort_order', { ascending: true }),
        []
      );

      const remindersData = await safeQuery<Row[]>(
        supabase
          .from('PortalReminders')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true }),
        []
      );

      const fixturesData = await safeQuery<Row[]>(
        supabase
          .from('PortalFixtures')
          .select('*')
          .eq('is_published', true)
          .order('fixture_date', { ascending: true }),
        []
      );

      const resultsData = await safeQuery<Row[]>(
        supabase
          .from('PortalResults')
          .select('*')
          .eq('is_published', true)
          .order('result_date', { ascending: false }),
        []
      );

      const programsData = await safeQuery<Row[]>(
        supabase
          .from('PortalPrograms')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true }),
        []
      );

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
            (a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
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
      setActiveSponsorIndex((index) => (index + 1) % sponsors.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [sponsors]);

  const activeSponsor = sponsors[activeSponsorIndex];

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-8">

        <section className="mb-5 overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl">
          <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Weekly Hockey Hub
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Welcome to the St Benedict&apos;s Hockey Portal.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                A clean central space for weekly plans, fixtures, results, programs, reminders, and leaderboard updates.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-400">
                Sponsors
              </p>
              <h2 className="mt-2 text-xl font-black">Supported by our partners</h2>

              <div className="mt-4">
                {loadingSponsors ? (
                  <Empty text="Loading sponsors..." />
                ) : sponsors.length === 0 ? (
                  <Empty text="Sponsor space available." />
                ) : (
                  <>
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                      <div className="flex h-40 items-center justify-center bg-white px-6 py-5 sm:h-44 sm:px-8 sm:py-6">
                        {activeSponsor?.image_url ? (
                          <img
                            src={activeSponsor.image_url}
                            alt={activeSponsor.name || 'Sponsor'}
                            className="block max-h-24 w-auto max-w-[80%] object-contain sm:max-h-28 sm:max-w-[85%]"
                          />
                        ) : (
                          <p className="text-center text-lg font-black text-slate-700">
                            {activeSponsor?.name || 'Sponsor'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-black text-slate-200">
                        {activeSponsor?.name || 'Sponsor'}
                      </p>

                      <div className="flex gap-1.5">
                        {sponsors.map((sponsor, index) => (
                          <button
                            key={sponsor.id}
                            onClick={() => setActiveSponsorIndex(index)}
                            className={`h-2.5 rounded-full transition-all ${
                              index === activeSponsorIndex
                                ? 'w-7 bg-emerald-400'
                                : 'w-2.5 bg-slate-700'
                            }`}
                            aria-label={`Show sponsor ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <nav className="sticky top-2 z-30 mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 text-[11px] font-black text-slate-200 shadow-xl backdrop-blur sm:top-3 sm:gap-2 sm:p-2 sm:text-xs">
          <a href="#week" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2">Week</a>
          <a href="#fixtures" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2">Fixtures</a>
          <a href="#results" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2">Results</a>
          <a href="#programs" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2">Programs</a>
          <a href="#reminders" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2">Reminders</a>
          <a href="#leaderboards" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2">Leaderboards</a>
        </nav>

        <div className="space-y-6">
          <Panel id="week" title="Week at a Glance" subtitle="Tap a day to expand details.">
            {loadingWeek ? (
              <Empty text="Loading week plan..." />
            ) : weekItems.length === 0 ? (
              <Empty text="No week plan published yet." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {weekItems.map((item) => {
                  const itemId = String(item.id);
                  const isOpen = openWeekItemId === itemId;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isOpen
                          ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenWeekItemId(isOpen ? null : itemId)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-emerald-400">
                              {item.day_label || 'Day'}
                            </p>
                            <h3 className="mt-2 text-sm font-black text-white">
                              {item.title || 'Week Item'}
                            </h3>
                          </div>

                          <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-black text-slate-400">
                            {isOpen ? 'Close' : 'Open'}
                          </span>
                        </div>

                        {!isOpen ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-400">
                            {item.details || 'Tap to view details.'}
                          </p>
                        ) : null}
                      </button>

                      {isOpen ? (
                        <div className="mt-3 border-t border-slate-700 pt-3">
                          <p className="text-sm leading-6 text-slate-200">
                            {item.details || 'No extra details added.'}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel id="fixtures" title="Fixtures" subtitle="Upcoming matches and venue information.">
              {loadingFixtures ? (
                <Empty text="Loading fixtures..." />
              ) : fixtures.length === 0 ? (
                <Empty text="No fixtures published yet." />
              ) : (
                <div className="space-y-3">
                  {fixtures.map((fixture) => (
                    <MatchCard
                      key={fixture.id}
                      label="Fixture"
                      team={fixture.team}
                      opponent={fixture.opponent}
                      date={fixture.fixture_date}
                      detail={fixture.venue || 'Venue TBC'}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel id="results" title="Results" subtitle="Final scores and goal scorers.">
              {loadingResults ? (
                <Empty text="Loading results..." />
              ) : results.length === 0 ? (
                <Empty text="No results published yet." />
              ) : (
                <div className="space-y-3">
                  {results.map((result) => (
                    <ResultCard key={result.id} result={result} />
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
                  <div
                    key={program.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
                  >
                    <h3 className="text-sm font-black">{program.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-slate-400">
                      {program.details || 'No details added.'}
                    </p>

                    {program.file_url ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <a
                          href={program.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-emerald-500 px-3 py-2 text-center text-xs font-black text-slate-950 transition hover:bg-emerald-400"
                        >
                          Open
                        </a>
                        <a
                          href={program.file_url}
                          download={program.file_name || `${program.title}.pdf`}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center text-xs font-black text-slate-200 transition hover:border-slate-500"
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

          <Panel id="reminders" title="Important Reminders" subtitle="Key updates for players and parents.">
            {loadingReminders ? (
              <Empty text="Loading reminders..." />
            ) : reminders.length === 0 ? (
              <Empty text="No reminders published yet." />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <p className="text-sm font-black">{reminder.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-400">{reminder.details || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <section id="leaderboards" className="grid grid-cols-1 gap-6 scroll-mt-24 sm:scroll-mt-28 xl:grid-cols-2">
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
    <section
      id={id}
      className="scroll-mt-24 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:scroll-mt-28 sm:p-6"
    >
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

function MatchCard({
  label,
  team,
  opponent,
  date,
  detail,
}: {
  label: string;
  team: string;
  opponent: string;
  date: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-300">
        {label}
      </span>
      <p className="mt-3 text-sm font-black text-white">
        {team || 'Team TBC'} <span className="text-slate-500">vs</span>{' '}
        {opponent || 'Opponent TBC'}
      </p>
      <p className="mt-1 text-sm text-slate-400">{dateLabel(date)} • {detail}</p>
    </div>
  );
}

function ResultCard({ result }: { result: Row }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-300">
            Result
          </span>
          <p className="mt-3 text-sm font-black">
            {result.team || 'Team TBC'} <span className="text-slate-500">vs</span>{' '}
            {result.opponent || 'Opponent TBC'}
          </p>
          <p className="mt-1 text-sm text-slate-400">{dateLabel(result.result_date)}</p>

          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Goal Scorers
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {result.goal_scorers || 'Not listed'}
          </p>
        </div>

        <div className="w-fit rounded-2xl bg-emerald-500 px-4 py-3 text-center text-slate-950">
          <p className="text-[11px] font-black uppercase tracking-wide">Final</p>
          <p className="text-sm font-black">{result.final_score || '—'}</p>
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ rows, type }: { rows: Row[]; type: 'gym' | 'performance' }) {
  return (
    <div className="space-y-3">
      {rows.map((athlete, index) => (
        <div
          key={athlete.id}
          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black">
                #{index + 1} {athlete.name || 'Unknown Athlete'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {athlete.team || 'Unassigned'}
              </p>
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