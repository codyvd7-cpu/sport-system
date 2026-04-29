'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

function text(value: any, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function dateLabel(value?: string | null) {
  if (!value) return 'TBC';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBC';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function weekRange() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = monday.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
  const end = sunday.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}

function daysSince(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PortalPage() {
  const [portalLoading, setPortalLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [portalError, setPortalError] = useState('');

  const [sponsors, setSponsors] = useState<Row[]>([]);
  const [weekItems, setWeekItems] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [fixtures, setFixtures] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [programs, setPrograms] = useState<Row[]>([]);

  const [gymLeaderboard, setGymLeaderboard] = useState<Row[]>([]);
  const [performanceLeaderboard, setPerformanceLeaderboard] = useState<Row[]>([]);
  const [selectedWeekItem, setSelectedWeekItem] = useState<Row | null>(null);

  async function loadPortalCore() {
    setPortalLoading(true);
    setPortalError('');

    try {
      const [sponsorsRes, weekRes, remindersRes, fixturesRes, resultsRes, programsRes] = await Promise.allSettled([
        supabase.from('PortalSponsors').select('*').eq('is_published', true).order('sort_order', { ascending: true }).limit(6),
        supabase.from('PortalWeekPlanItems').select('*').order('sort_order', { ascending: true }).limit(20),
        supabase.from('PortalReminders').select('*').eq('is_published', true).order('sort_order', { ascending: true }).limit(10),
        supabase.from('PortalFixtures').select('*').eq('is_published', true).order('fixture_date', { ascending: true }).limit(10),
        supabase.from('PortalResults').select('*').eq('is_published', true).order('result_date', { ascending: false }).limit(10),
        supabase.from('PortalPrograms').select('*').eq('is_published', true).order('sort_order', { ascending: true }).limit(4),
      ]);

      if (sponsorsRes.status === 'fulfilled') setSponsors(sponsorsRes.value.data || []);
      if (weekRes.status === 'fulfilled') setWeekItems(weekRes.value.data || []);
      if (remindersRes.status === 'fulfilled') setReminders(remindersRes.value.data || []);
      if (fixturesRes.status === 'fulfilled') setFixtures(fixturesRes.value.data || []);
      if (resultsRes.status === 'fulfilled') setResults(resultsRes.value.data || []);
      if (programsRes.status === 'fulfilled') setPrograms(programsRes.value.data || []);
    } catch (err) {
      console.error(err);
      setPortalError('Some portal content could not load. Refresh the page or check the connection.');
    } finally {
      setPortalLoading(false);
    }
  }

  async function loadLeaderboards() {
    setLeaderboardLoading(true);

    try {
      const [athletesRes, attendanceRes, performanceRes] = await Promise.allSettled([
        supabase.from('athletes').select('id,name,team').limit(300),
        supabase.from('Attendance').select('athlete_id,status,session_type').limit(1000),
        supabase.from('Performance').select('athlete_id,test_date').limit(1000),
      ]);

      const athletes = athletesRes.status === 'fulfilled' ? athletesRes.value.data || [] : [];
      const attendance = attendanceRes.status === 'fulfilled' ? attendanceRes.value.data || [] : [];
      const performance = performanceRes.status === 'fulfilled' ? performanceRes.value.data || [] : [];

      const gym = athletes
        .map((athlete: Row) => {
          const records = attendance.filter((r: Row) => r.athlete_id === athlete.id);
          const total = records.length;
          const positive = records.filter((r: Row) => ['present', 'late'].includes(String(r.status).toLowerCase())).length;
          const gymSessions = records.filter((r: Row) => String(r.session_type).toLowerCase() === 'gym').length;
          const attendanceRate = total ? Math.round((positive / total) * 100) : 0;
          const score = Math.round(attendanceRate * 0.7 + Math.min(gymSessions * 6, 30));

          return { ...athlete, attendanceRate, gymSessions, score };
        })
        .filter((a: Row) => a.score > 0)
        .sort((a: Row, b: Row) => b.score - a.score)
        .slice(0, 5);

      const perf = athletes
        .map((athlete: Row) => {
          const records = performance.filter((r: Row) => r.athlete_id === athlete.id);
          const sorted = [...records].sort(
            (a: Row, b: Row) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
          );
          const latest = sorted[0];
          const days = latest ? daysSince(latest.test_date) : null;

          const recency =
            days === null ? 0 :
            days <= 7 ? 40 :
            days <= 14 ? 30 :
            days <= 30 ? 20 : 5;

          const score = records.length * 10 + recency;

          return { ...athlete, testCount: records.length, days, score };
        })
        .filter((a: Row) => a.score > 0)
        .sort((a: Row, b: Row) => b.score - a.score)
        .slice(0, 5);

      setGymLeaderboard(gym);
      setPerformanceLeaderboard(perf);
    } catch (err) {
      console.error(err);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  useEffect(() => {
    loadPortalCore();
    loadLeaderboards();
  }, []);

  const stats = useMemo(() => {
    return [
      { label: 'Week Items', value: weekItems.length },
      { label: 'Fixtures', value: fixtures.length },
      { label: 'Programs', value: programs.length },
      { label: 'Sponsors', value: sponsors.length },
    ];
  }, [weekItems.length, fixtures.length, programs.length, sponsors.length]);

  if (portalLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-emerald-500/20" />
          <p className="text-lg font-bold">Loading Bennies Portal</p>
          <p className="mt-2 text-sm text-slate-400">Preparing the latest week info...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-3 pb-10 pt-4 sm:px-6 lg:px-8">
        <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-2xl">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-6 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Bennies Hockey</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Player &amp; Parent Portal
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                A central weekly hub for plans, reminders, fixtures, results, training programs, and performance leaderboards.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#week" className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">
                  View This Week
                </a>
                <a href="#programs" className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800">
                  Open Programs
                </a>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    <p className="text-2xl font-black text-white">{item.value}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">Sponsors</p>
                  <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Supported By Our Partners</h2>
                </div>
              </div>

              {sponsors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/80 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-300">Sponsor space available</p>
                  <p className="mt-1 text-xs text-slate-500">Partner logos will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {sponsors.map((sponsor) => {
                    const tile = (
                      <div className="h-full rounded-2xl border border-slate-200 bg-white p-3 shadow-lg transition hover:-translate-y-0.5">
                        <div className="flex h-20 items-center justify-center overflow-hidden rounded-xl bg-white sm:h-24">
                          {sponsor.image_url ? (
                            <img src={sponsor.image_url} alt={text(sponsor.name, 'Sponsor')} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="px-2 text-center text-xs font-bold text-slate-700">{sponsor.name}</span>
                          )}
                        </div>
                        <p className="mt-3 line-clamp-1 text-center text-xs font-bold text-slate-700">{sponsor.name}</p>
                      </div>
                    );

                    return sponsor.sponsor_link ? (
                      <a key={sponsor.id} href={sponsor.sponsor_link} target="_blank" rel="noreferrer" className="block h-full">
                        {tile}
                      </a>
                    ) : (
                      <div key={sponsor.id} className="h-full">{tile}</div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {portalError ? (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {portalError}
          </div>
        ) : null}

        {selectedWeekItem ? (
          <section className="mb-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">{selectedWeekItem.day_label}</p>
                <h2 className="mt-2 text-2xl font-black">{selectedWeekItem.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{selectedWeekItem.details || 'No extra details yet.'}</p>
              </div>
              <button onClick={() => setSelectedWeekItem(null)} className="w-fit rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200">
                Close
              </button>
            </div>
          </section>
        ) : null}

        <div className="space-y-6">
          <section id="week" className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">Week at a Glance</h2>
                <p className="mt-1 text-sm text-slate-400">{weekRange()}</p>
              </div>
              <span className="w-fit rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">Tap a card for more</span>
            </div>

            {weekItems.length === 0 ? (
              <Empty text="No week plan published yet." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {weekItems.map((item) => (
                  <button key={item.id} onClick={() => setSelectedWeekItem(item)} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-emerald-500/60 hover:bg-slate-950">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-400">{item.day_label}</p>
                    <h3 className="mt-2 text-sm font-bold text-white">{item.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-400">{item.details || 'Tap to open details.'}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6">
            <h2 className="text-2xl font-black">Important Reminders</h2>
            <p className="mt-1 text-sm text-slate-400">Key updates for players and parents.</p>

            {reminders.length === 0 ? (
              <div className="mt-4"><Empty text="No reminders published yet." /></div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-sm font-bold text-white">{reminder.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-400">{reminder.details || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel title="Fixtures" subtitle="Upcoming matches and venue information.">
              {fixtures.length === 0 ? <Empty text="No fixtures published yet." /> : (
                <div className="space-y-3">
                  {fixtures.map((fixture) => (
                    <div key={fixture.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <p className="text-sm font-bold">{fixture.team} vs {fixture.opponent}</p>
                      <p className="mt-1 text-sm text-slate-400">{dateLabel(fixture.fixture_date)} • {fixture.venue || 'Venue TBC'}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Results" subtitle="Final scores and goal scorers.">
              {results.length === 0 ? <Empty text="No results published yet." /> : (
                <div className="space-y-3">
                  {results.map((result) => (
                    <div key={result.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <div>
                          <p className="text-sm font-bold">{result.team} vs {result.opponent}</p>
                          <p className="mt-1 text-sm text-slate-400">{dateLabel(result.result_date)}</p>
                          <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Goal Scorers</p>
                          <p className="mt-1 text-sm text-slate-300">{result.goal_scorers || 'Not listed'}</p>
                        </div>
                        <span className="w-fit rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">{result.final_score || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <section id="programs" className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">Programs</h2>
                <p className="mt-1 text-sm text-slate-400">Current gym, mobility, and recovery work.</p>
              </div>
              <span className="w-fit rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">Max 4 active</span>
            </div>

            {programs.length === 0 ? <Empty text="No programs published yet." /> : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {programs.map((program) => (
                  <div key={program.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{program.category || 'Program'}</span>
                      <span className="text-xs text-slate-500">{program.day_label || '—'}</span>
                    </div>
                    <h3 className="mt-3 text-sm font-bold">{program.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-slate-400">{program.details || 'No details added.'}</p>

                    {program.file_url ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <a href={program.file_url} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-500 px-3 py-2 text-center text-xs font-bold text-slate-950">Open</a>
                        <a href={program.file_url} download={program.file_name || `${program.title}.pdf`} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center text-xs font-bold text-slate-200">Download</a>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-slate-500">No PDF attached.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel title="Gym Leaderboard" subtitle="Based on gym attendance and attendance quality.">
              {leaderboardLoading ? <Empty text="Loading gym leaderboard..." /> : gymLeaderboard.length === 0 ? <Empty text="No gym leaderboard data yet." /> : (
                <Leaderboard rows={gymLeaderboard} type="gym" />
              )}
            </Panel>

            <Panel title="Performance Leaderboard" subtitle="Based on testing volume and testing recency.">
              {leaderboardLoading ? <Empty text="Loading performance leaderboard..." /> : performanceLeaderboard.length === 0 ? <Empty text="No performance data yet." /> : (
                <Leaderboard rows={performanceLeaderboard} type="performance" />
              )}
            </Panel>
          </section>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
      {text}
    </div>
  );
}

function Leaderboard({ rows, type }: { rows: Row[]; type: 'gym' | 'performance' }) {
  return (
    <div className="space-y-3">
      {rows.map((athlete, index) => (
        <div key={athlete.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold">#{index + 1} {athlete.name || 'Unknown Athlete'}</p>
              <p className="mt-1 text-sm text-slate-400">{athlete.team || 'Unassigned'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-200">Score {athlete.score}</span>
              {type === 'gym' ? (
                <>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{athlete.gymSessions || 0} gym</span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{athlete.attendanceRate || 0}%</span>
                </>
              ) : (
                <>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{athlete.testCount || 0} tests</span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {athlete.days === null || athlete.days === undefined ? 'No date' : `${athlete.days}d ago`}
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