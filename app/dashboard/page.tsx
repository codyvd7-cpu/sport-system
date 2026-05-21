'use client';

import Link from 'next/link';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const TEAM_GROUPS = [
  { group: 'Senior', color: 'violet', teams: ['1sts', '2nds', '3rds', '4ths', '5ths'] },
  { group: 'U16', color: 'sky', teams: ['U16A', 'U16B', 'U16C', 'U16D', 'U16E'] },
  { group: 'U15', color: 'emerald', teams: ['U15A', 'U15B', 'U15C', 'U15D', 'U15E'] },
  { group: 'U14', color: 'amber', teams: ['U14A', 'U14B', 'U14C', 'U14D', 'U14E'] },
];
const ALL_TEAMS = TEAM_GROUPS.flatMap((g) => g.teams);
const COLORS: Record<string, string> = {
  violet: 'text-violet-400', sky: 'text-sky-400', emerald: 'text-emerald-400', amber: 'text-amber-400',
};

function today() {
  return new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function weekAgo() { return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; }
function formatTime(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export default function DashboardPage() {
  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [performance, setPerformance] = React.useState<Row[]>([]);
  const [recentNotes, setRecentNotes] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [coachName, setCoachName] = React.useState('');

  React.useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setCoachName('Coach');
      }
      const [athRes, attRes, perfRes, notesRes] = await Promise.all([
        supabase.from('athletes').select('id, full_name, team, availability, age_group'),
        supabase.from('attendance').select('id, athlete_id, status, session_date, session_type').gte('session_date', weekAgo()).order('session_date', { ascending: false }).limit(500),
        supabase.from('performance_tests').select('id, athlete_id, test_type, value, unit, test_date').order('test_date', { ascending: false }).limit(10),
        supabase.from('coach_notes').select('id, athlete_id, note, created_at').eq('is_feedback', false).order('created_at', { ascending: false }).limit(5),
      ]);
      setAthletes(athRes.data || []);
      setAttendance(attRes.data || []);
      setPerformance(perfRes.data || []);
      setRecentNotes(notesRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  // ── COMPUTED ──────────────────────────────────────────────
  const totalPlayers = athletes.length;
  const assignedPlayers = athletes.filter((a) => a.team && ALL_TEAMS.includes(a.team)).length;
  const unassigned = totalPlayers - assignedPlayers;
  const injured = athletes.filter((a) => a.availability === 'Injured').length;
  const modified = athletes.filter((a) => a.availability === 'Modified').length;
  const available = totalPlayers - injured - modified - athletes.filter((a) => a.availability === 'Resting').length;

  const recentAbsences = attendance.filter((r) => r.status?.toLowerCase() === 'absent');
  const recentPresent = attendance.filter((r) => ['present', 'late'].includes(r.status?.toLowerCase() || ''));
  const attRate = attendance.length > 0 ? Math.round((recentPresent.length / attendance.length) * 100) : null;

  const activeTeams = ALL_TEAMS.filter((t) => athletes.some((a) => a.team === t));

  const teamStats = React.useMemo(() => {
    return activeTeams.map((team) => {
      const squad = athletes.filter((a) => a.team === team);
      const teamAtt = attendance.filter((r) => squad.some((a) => a.id === r.athlete_id));
      const present = teamAtt.filter((r) => ['present', 'late'].includes(r.status?.toLowerCase() || '')).length;
      const absent = teamAtt.filter((r) => r.status?.toLowerCase() === 'absent').length;
      const rate = teamAtt.length > 0 ? Math.round((present / teamAtt.length) * 100) : null;
      const inj = squad.filter((a) => a.availability === 'Injured').length;
      const mod = squad.filter((a) => a.availability === 'Modified').length;
      return { team, count: squad.length, rate, absent, injured: inj, modified: mod };
    }).sort((a, b) => b.count - a.count);
  }, [athletes, attendance, activeTeams]);

  const recentActivity = React.useMemo(() => {
    const attItems = attendance.slice(0, 5).map((r) => {
      const ath = athletes.find((a) => a.id === r.athlete_id);
      return { type: 'att', name: ath?.full_name || 'Unknown', detail: `${r.status} · ${r.session_type || 'Session'}`, team: ath?.team || '', date: r.session_date };
    });
    const perfItems = performance.slice(0, 5).map((r) => {
      const ath = athletes.find((a) => a.id === r.athlete_id);
      const val = r.value !== null && r.value !== undefined ? `${r.value}${r.unit ? ' ' + r.unit : ''}` : '—';
      return { type: 'perf', name: ath?.full_name || 'Unknown', detail: `${r.test_type} · ${val}`, team: ath?.team || '', date: r.test_date };
    });
    return [...attItems, ...perfItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [attendance, performance, athletes]);

  const lowAttendanceTeams = teamStats.filter((t) => t.rate !== null && t.rate < 70);
  const injuredAthletes = athletes.filter((a) => a.availability === 'Injured').slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">St Benedict's College Hockey</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {coachName ? `Welcome, ${coachName}` : new Date().toLocaleDateString('en-ZA', { weekday: 'long' })}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <Link href="/attendance"
            className="shrink-0 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-black text-sky-300 hover:bg-sky-500/20 transition">
            Mark Attendance →
          </Link>
        </div>

        {/* Department KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total Players', value: totalPlayers, color: 'sky', link: '/athletes' },
            { label: 'Available', value: available, color: 'emerald', link: '/athletes' },
            { label: 'Injured', value: injured, color: injured > 0 ? 'red' : 'slate', link: '/athletes' },
            { label: 'Modified', value: modified, color: modified > 0 ? 'amber' : 'slate', link: '/athletes' },
            { label: 'Att Rate (7d)', value: attRate !== null ? `${attRate}%` : '—', color: attRate === null ? 'slate' : attRate >= 80 ? 'emerald' : attRate >= 60 ? 'amber' : 'red', link: '/attendance' },
            { label: 'Unassigned', value: unassigned, color: unassigned > 0 ? 'amber' : 'emerald', link: '/squad' },
          ].map((kpi) => (
            <Link key={kpi.label} href={kpi.link} className={`rounded-2xl border bg-slate-900 p-4 transition hover:border-opacity-60 ${kpi.color === 'sky' ? 'border-sky-500/20' : kpi.color === 'emerald' ? 'border-emerald-500/20' : kpi.color === 'red' ? 'border-red-500/20' : kpi.color === 'amber' ? 'border-amber-500/20' : 'border-slate-800'}`}>
              <p className={`text-2xl font-black sm:text-3xl ${kpi.color === 'sky' ? 'text-sky-400' : kpi.color === 'emerald' ? 'text-emerald-400' : kpi.color === 'red' ? 'text-red-400' : kpi.color === 'amber' ? 'text-amber-400' : 'text-white'}`}>{kpi.value}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{kpi.label}</p>
            </Link>
          ))}
        </div>

        {/* Alerts */}
        {(lowAttendanceTeams.length > 0 || injuredAthletes.length > 0 || unassigned > 10) && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-red-400">Requires Attention</p>
            <div className="flex flex-wrap gap-3">
              {unassigned > 10 && (
                <Link href="/squad" className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition">
                  {unassigned} players unassigned → Squad Board
                </Link>
              )}
              {lowAttendanceTeams.map((t) => (
                <Link key={t.team} href={`/teams/${encodeURIComponent(t.team)}`} className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition">
                  {t.team} attendance {t.rate}%
                </Link>
              ))}
              {injuredAthletes.map((a) => (
                <Link key={a.id} href={`/athletes/${a.id}`} className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition">
                  {a.full_name || a.name} — Injured
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* LEFT — Team health */}
          <div className="space-y-6 xl:col-span-2">

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Mark Attendance', href: '/attendance', color: 'emerald',
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 mx-auto"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
                { label: 'Testing Session', href: '/performance', color: 'violet',
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 mx-auto"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
                { label: 'Squad Board', href: '/squad', color: 'sky',
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 mx-auto"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
                { label: 'Portal', href: '/portal', color: 'slate',
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 mx-auto"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
              ].map((action) => (
                <Link key={action.label} href={action.href}
                  className={`rounded-2xl border p-4 text-center transition hover:scale-[1.02] ${action.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400' : action.color === 'violet' ? 'border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400' : action.color === 'sky' ? 'border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 text-sky-400' : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400'}`}>
                  <div className="mb-2">{action.icon}</div>
                  <p className="text-xs font-black text-white">{action.label}</p>
                </Link>
              ))}
            </div>

            {/* Team Health */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Department</p>
                  <h2 className="mt-0.5 text-lg font-black text-white">Team Health</h2>
                  <p className="text-xs text-slate-500">Last 7 days attendance</p>
                </div>
                <Link href="/teams" className="text-xs font-semibold text-slate-500 hover:text-slate-300">All Teams →</Link>
              </div>

              {loading ? (
                <div className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" /><p className="text-sm text-slate-400">Loading...</p></div>
              ) : activeTeams.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
                  <p className="text-sm text-slate-500">No teams have players yet.</p>
                  <Link href="/squad" className="mt-2 inline-block text-xs text-sky-400 hover:text-sky-300">Go to Squad Board →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {teamStats.map((t) => (
                    <Link key={t.team} href={`/teams/${encodeURIComponent(t.team)}`}
                      className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-slate-600 transition">
                      <div className="w-16 shrink-0">
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-300">{t.team}</span>
                      </div>
                      <div className="flex-1">
                        {t.rate !== null ? (
                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">{t.count} players</span>
                              <span className={`text-[10px] font-black ${t.rate >= 80 ? 'text-emerald-400' : t.rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{t.rate}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                              <div className={`h-full rounded-full ${t.rate >= 80 ? 'bg-emerald-500' : t.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${t.rate}%` }} />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600">{t.count} players · no attendance data</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2 text-[10px]">
                        {t.injured > 0 && <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-black text-red-300">{t.injured} inj</span>}
                        {t.modified > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-black text-amber-300">{t.modified} mod</span>}
                        {t.absent > 0 && <span className="text-slate-600">{t.absent} abs</span>}
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0 text-slate-600"><path d="M9 18l6-6-6-6"/></svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent absences */}
            {recentAbsences.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-red-400">Last 7 Days</p>
                    <h2 className="mt-0.5 text-lg font-black text-white">Recent Absences</h2>
                  </div>
                  <Link href="/attendance" className="text-xs font-semibold text-slate-500 hover:text-slate-300">Full Log →</Link>
                </div>
                <div className="space-y-1.5">
                  {recentAbsences.slice(0, 6).map((r) => {
                    const ath = athletes.find((a) => a.id === r.athlete_id);
                    if (!ath) return null;
                    return (
                      <Link key={r.id} href={`/athletes/${ath.id}`}
                        className="flex items-center gap-3 rounded-xl border border-red-500/10 bg-red-500/5 p-3 hover:bg-red-500/10 transition">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[9px] font-black text-slate-400">
                          {(ath.full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{ath.full_name || ath.name}</p>
                          <p className="text-[10px] text-slate-500">{ath.team} · {r.session_type}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-500">{formatTime(r.session_date)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Activity + quick links */}
          <div className="space-y-6">

            {/* Recent Activity */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Live Feed</p>
                <h2 className="mt-0.5 text-lg font-black text-white">Recent Activity</h2>
              </div>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity.</p>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${item.type === 'att' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-violet-500/15 text-violet-300'}`}>
                        {item.type === 'att' ? 'ATT' : 'PRF'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{item.detail}</p>
                        {item.team && <p className="text-[9px] text-slate-700">{item.team} · {formatTime(item.date)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Squad groups overview */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Department</p>
                  <h2 className="mt-0.5 text-lg font-black text-white">Squad Overview</h2>
                </div>
                <Link href="/squad" className="text-xs font-semibold text-slate-500 hover:text-slate-300">Manage →</Link>
              </div>
              <div className="space-y-3">
                {TEAM_GROUPS.map((group) => {
                  const groupAthletes = athletes.filter((a) => group.teams.includes(a.team || ''));
                  const groupInjured = groupAthletes.filter((a) => a.availability === 'Injured').length;
                  return (
                    <div key={group.group} className="flex items-center gap-3">
                      <p className={`w-14 shrink-0 text-xs font-black ${COLORS[group.color]}`}>{group.group}</p>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-slate-400">{groupAthletes.length} players</span>
                          {groupInjured > 0 && <span className="text-red-400">{groupInjured} injured</span>}
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div className={`h-full rounded-full ${group.color === 'violet' ? 'bg-violet-500' : group.color === 'sky' ? 'bg-sky-500' : group.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${totalPlayers > 0 ? (groupAthletes.length / totalPlayers) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-black text-white w-6 text-right">{groupAthletes.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent coach notes */}
            {recentNotes.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Latest</p>
                  <h2 className="mt-0.5 text-lg font-black text-white">Coach Notes</h2>
                </div>
                <div className="space-y-2">
                  {recentNotes.map((note) => {
                    const ath = athletes.find((a) => a.id === note.athlete_id);
                    return (
                      <Link key={note.id} href={`/athletes/${ath?.id || '#'}`}
                        className="block rounded-xl border border-amber-500/10 bg-amber-500/5 p-3 hover:bg-amber-500/10 transition">
                        <p className="text-xs font-semibold text-amber-300 truncate">{ath?.full_name || 'Unknown'}</p>
                        <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{note.note}</p>
                        <p className="mt-1 text-[9px] text-slate-600">{formatTime(note.created_at)}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}