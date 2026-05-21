'use client';

import Link from 'next/link';
import * as React from 'react';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ name: string }> };

function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(); }
function formatDate(d?: string | null) { if (!d) return '—'; const date = new Date(d); if (Number.isNaN(date.getTime())) return '—'; return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }); }

const LOWER_IS_BETTER = ['Bronco', '10m Sprint', '30m Sprint', '505', 'RSA'];

export default function TeamDashboardPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const teamName = decodeURIComponent(resolvedParams.name);

  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [performance, setPerformance] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [aiReport, setAiReport] = React.useState('');
  const [generatingReport, setGeneratingReport] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const athRes = await supabase.from('athletes').select('*').eq('team', teamName).order('full_name');
      const squad = athRes.data || [];
      setAthletes(squad);
      if (squad.length === 0) { setLoading(false); return; }
      const ids = squad.map((a) => a.id);
      const [attRes, perfRes] = await Promise.all([
        supabase.from('attendance').select('*').in('athlete_id', ids).order('session_date', { ascending: false }).limit(500),
        supabase.from('performance_tests').select('*').in('athlete_id', ids).order('test_date', { ascending: false }),
      ]);
      setAttendance(attRes.data || []);
      setPerformance(perfRes.data || []);
      setLoading(false);
    }
    load();
  }, [teamName]);

  // ── COMPUTED ──────────────────────────────────────────────
  const available = athletes.filter((a) => !a.availability || a.availability === 'Available');
  const injured = athletes.filter((a) => a.availability === 'Injured');
  const modified = athletes.filter((a) => a.availability === 'Modified');
  const resting = athletes.filter((a) => a.availability === 'Resting');

  const athleteAttendance = React.useMemo(() => {
    return athletes.map((a: Row) => {
      const att = attendance.filter((r) => r.athlete_id === a.id);
      const total = att.length;
      const present = att.filter((r) => ['present', 'late'].includes(r.status?.toLowerCase() || '')).length;
      const absent = att.filter((r) => r.status?.toLowerCase() === 'absent').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : null;
      const lastSession = att[0]?.session_date || null;
      return { id: a.id as string, full_name: (a.full_name || '') as string, availability: (a.availability || 'Available') as string, position: (a.position || '') as string, total, present, absent, rate, lastSession };
    });
  }, [athletes, attendance]);

  const teamAttRate = React.useMemo(() => {
    const rates = athleteAttendance.filter((a) => a.rate !== null).map((a) => a.rate as number);
    return rates.length > 0 ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : null;
  }, [athleteAttendance]);

  const lowAttendance = athleteAttendance.filter((a) => a.rate !== null && a.rate < 70);
  const noData = athletes.filter((a) => !attendance.find((r) => r.athlete_id === a.id));

  const athletePBs = React.useMemo(() => {
    return athletes.map((a) => {
      const perf = performance.filter((r) => r.athlete_id === a.id && r.value !== null);
      const testTypes = Array.from(new Set(perf.map((r) => r.test_type)));
      const pbs: Record<string, { value: number; unit: string }> = {};
      testTypes.forEach((t) => {
        const vals = perf.filter((r) => r.test_type === t);
        const lower = LOWER_IS_BETTER.some((lt) => t.toLowerCase().includes(lt.toLowerCase()));
        const best = lower ? vals.reduce((a, b) => a.value < b.value ? a : b) : vals.reduce((a, b) => a.value > b.value ? a : b);
        pbs[t] = { value: best.value, unit: best.unit || '' };
      });
      return { ...a, full_name: a.full_name || a.name || '', pbs, testCount: perf.length };
    });
  }, [athletes, performance]);

  const topAttendance = [...athleteAttendance].filter((a) => a.rate !== null).sort((a, b) => (b.rate || 0) - (a.rate || 0)).slice(0, 5);

  const testTypes = React.useMemo(() => Array.from(new Set(performance.map((r) => r.test_type))).sort(), [performance]);

  const teamAvgByTest = React.useMemo(() => {
    const avgs: Record<string, { avg: number; unit: string }> = {};
    testTypes.forEach((t) => {
      const vals = performance.filter((r) => r.test_type === t && r.value !== null);
      if (!vals.length) return;
      avgs[t] = { avg: Math.round((vals.reduce((s, r) => s + r.value, 0) / vals.length) * 100) / 100, unit: vals[0].unit || '' };
    });
    return avgs;
  }, [performance, testTypes]);

  async function generateTeamReport() {
    setGeneratingReport(true);
    setAiReport('');

    const injuredAthletes = athletes.filter((a) => a.availability === 'Injured');
    const modifiedAthletes = athletes.filter((a) => a.availability === 'Modified');

    const attData = athleteAttendance.filter((a) => a.rate !== null)
      .sort((a, b) => (b.rate || 0) - (a.rate || 0));
    const topAtt = attData.slice(0, 3).map((a) => ({ name: a.full_name, rate: a.rate }));
    const lowAtt = attData.filter((a) => (a.rate || 0) < 70).map((a) => ({ name: a.full_name, rate: a.rate }));

    const testAvgs = Object.entries(teamAvgByTest).map(([test, data]) => ({
      test, avg: data.avg, unit: data.unit
    }));

    const topPerformers = athletePBs
      .filter((a) => Object.keys(a.pbs).length > 0)
      .slice(0, 3)
      .map((a) => ({
        name: a.full_name,
        highlights: Object.entries(a.pbs).slice(0, 2).map(([t, v]) => `${t}: ${(v as any).value}${(v as any).unit}`).join(', ')
      }));

    const payload = {
      team: {
        name: teamName,
        playerCount: athletes.length,
        available: available.length,
        injured: injuredAthletes.length,
        modified: modifiedAthletes.length,
        injuredNames: injuredAthletes.map((a) => a.full_name || a.name || ''),
        modifiedNames: modifiedAthletes.map((a) => a.full_name || a.name || ''),
        attendanceRate: teamAttRate,
        lowAttendance: lowAtt,
        topAttendance: topAtt,
        testAverages: testAvgs,
        topPerformers,
      }
    };

    try {
      const res = await fetch('/api/team-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setAiReport(data.text || 'Could not generate report.');
    } catch {
      setAiReport('Connection error. Please try again.');
    }
    setGeneratingReport(false);
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading team dashboard...</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <Link href="/teams" className="mb-4 inline-block text-xs font-semibold text-slate-500 hover:text-slate-300">← Teams</Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">Team Dashboard</p>
              <h1 className="mt-1 text-4xl font-black tracking-tight text-white">{teamName}</h1>
              <p className="mt-1 text-sm text-slate-500">{athletes.length} players · 2026 Season</p>
            </div>
            <Link href={`/attendance`} className="shrink-0 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-black text-sky-300 hover:bg-sky-500/20 transition">
              Mark Attendance →
            </Link>
          </div>
        </div>

        {athletes.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-4xl mb-3"></p>
            <p className="text-lg font-black text-white">No players assigned</p>
            <p className="mt-2 text-sm text-slate-500">Go to the Squad Board to assign players to this team.</p>
            <Link href="/squad" className="mt-4 inline-block rounded-xl border border-sky-500 bg-sky-500/15 px-5 py-2.5 text-sm font-black text-sky-300">Open Squad Board →</Link>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {[
                { label: 'Squad Size', value: athletes.length, color: 'sky' },
                { label: 'Available', value: available.length, color: 'emerald' },
                { label: 'Injured', value: injured.length, color: 'red' },
                { label: 'Modified', value: modified.length, color: 'amber' },
                { label: 'Att Rate', value: teamAttRate !== null ? `${teamAttRate}%` : '—', color: teamAttRate === null ? 'slate' : teamAttRate >= 80 ? 'emerald' : teamAttRate >= 60 ? 'amber' : 'red' },
                { label: 'Test Records', value: performance.length, color: 'violet' },
              ].map((kpi) => (
                <div key={kpi.label} className={`rounded-2xl border bg-slate-900 p-4 ${kpi.color === 'sky' ? 'border-sky-500/20' : kpi.color === 'emerald' ? 'border-emerald-500/20' : kpi.color === 'red' ? 'border-red-500/20' : kpi.color === 'amber' ? 'border-amber-500/20' : kpi.color === 'violet' ? 'border-violet-500/20' : 'border-slate-800'}`}>
                  <p className={`text-2xl font-black sm:text-3xl ${kpi.color === 'sky' ? 'text-sky-400' : kpi.color === 'emerald' ? 'text-emerald-400' : kpi.color === 'red' ? 'text-red-400' : kpi.color === 'amber' ? 'text-amber-400' : kpi.color === 'violet' ? 'text-violet-400' : 'text-white'}`}>{kpi.value}</p>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* AI Team Report */}
            <div className="mb-6 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">AI Intelligence</p>
                  <h2 className="mt-0.5 text-lg font-black text-white">Team Report</h2>
                  <p className="text-xs text-slate-500">AI-generated from live squad data</p>
                </div>
                <button onClick={generateTeamReport} disabled={generatingReport}
                  className="shrink-0 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2.5 text-sm font-black text-violet-300 hover:bg-violet-500/25 disabled:opacity-50 transition flex items-center gap-2">
                  {generatingReport ? (
                    <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /> Generating...</>
                  ) : (
                    <>{aiReport ? 'Regenerate Report' : 'Generate Team Report'}</>
                  )}
                </button>
              </div>
              {aiReport && (
                <div className="mt-4 rounded-xl border border-violet-500/15 bg-slate-950/50 p-4 space-y-3">
                  {aiReport.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className={`text-sm leading-relaxed ${line.match(/^[0-9]\.|^[A-Z\s]+:/) ? 'font-black text-violet-300 mt-2' : 'text-slate-200'}`}>
                      {line}
                    </p>
                  ))}
                  <button onClick={() => { navigator.clipboard.writeText(aiReport); }}
                    className="mt-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition">
                    Copy Report
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

              {/* LEFT — Main content */}
              <div className="space-y-6 xl:col-span-2">

                {/* Availability Board */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Readiness</p><h2 className="mt-0.5 text-lg font-black text-white">Availability Board</h2></div>
                  <div className="space-y-3">
                    {[
                      { label: 'Available', athletes: available, color: 'emerald', icon: '🟢' },
                      { label: 'Modified', athletes: modified, color: 'amber', icon: '🟡' },
                      { label: 'Injured', athletes: injured, color: 'red', icon: '🔴' },
                      { label: 'Resting', athletes: resting, color: 'sky', icon: '⚪' },
                    ].filter((g) => g.athletes.length > 0).map((group) => (
                      <div key={group.label}>
                        <p className={`mb-2 text-xs font-black uppercase tracking-wide ${group.color === 'emerald' ? 'text-emerald-400' : group.color === 'amber' ? 'text-amber-400' : group.color === 'red' ? 'text-red-400' : 'text-sky-400'}`}>
                          {group.icon} {group.label} ({group.athletes.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.athletes.map((a) => (
                            <Link key={a.id} href={`/athletes/${a.id}`}
                              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition hover:scale-[1.02] ${group.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' : group.color === 'amber' ? 'border-amber-500/20 bg-amber-500/5 text-amber-300' : group.color === 'red' ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-sky-500/20 bg-sky-500/5 text-sky-300'}`}>
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[9px] font-black text-slate-400">{initials(a.full_name || '?')}</span>
                              {a.full_name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attendance Intelligence */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Commitment</p><h2 className="mt-0.5 text-lg font-black text-white">Attendance Intelligence</h2></div>

                  {/* Team rate bar */}
                  {teamAttRate !== null && (
                    <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-semibold text-slate-300">Team Attendance Rate</span>
                        <span className={`font-black ${teamAttRate >= 80 ? 'text-emerald-400' : teamAttRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{teamAttRate}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div className={`h-full rounded-full ${teamAttRate >= 80 ? 'bg-emerald-500' : teamAttRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${teamAttRate}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Alerts */}
                  {lowAttendance.length > 0 && (
                    <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-red-400">Attention Required</p>
                      <div className="space-y-1.5">
                        {lowAttendance.map((a) => (
                          <div key={a.id} className="flex items-center justify-between">
                            <Link href={`/athletes/${a.id}`} className="text-sm text-red-200 hover:text-white">{a.full_name}</Link>
                            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-black text-red-300">{a.rate ?? 0}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual attendance */}
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {athleteAttendance.sort((a, b) => (b.rate || 0) - (a.rate || 0)).map((a) => (
                      <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[9px] font-black text-slate-400">{initials(a.full_name || '?')}</div>
                        <div className="min-w-0 flex-1">
                          <Link href={`/athletes/${a.id}`} className="text-sm font-semibold text-white hover:text-sky-300 truncate block">{a.full_name}</Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            {a.rate !== null ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800 max-w-20">
                                  <div className={`h-full rounded-full ${(a.rate ?? 0) >= 80 ? 'bg-emerald-500' : (a.rate ?? 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${a.rate ?? 0}%` }} />
                                </div>
                                <span className={`text-[10px] font-black ${(a.rate ?? 0) >= 80 ? 'text-emerald-400' : (a.rate ?? 0) >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{a.rate ?? 0}%</span>
                              </div>
                            ) : <span className="text-[10px] text-slate-600">No data</span>}
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-600">{a.total} sessions</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Performance Averages */}
                {Object.keys(teamAvgByTest).length > 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Team Performance</p><h2 className="mt-0.5 text-lg font-black text-white">Average Test Results</h2></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(teamAvgByTest).map(([test, data]) => (
                        <div key={test} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{test}</p>
                          <p className="mt-1 text-2xl font-black text-white">{data.avg}{data.unit}</p>
                          <p className="mt-0.5 text-[10px] text-slate-600">Team average</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT — Squad list + leaderboard */}
              <div className="space-y-6">

                {/* Full squad */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Squad</p><h2 className="mt-0.5 text-lg font-black text-white">{athletes.length} Players</h2></div>
                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    {athletes.map((a) => {
                      const avStatus = a.availability || 'Available';
                      const dot = avStatus === 'Available' ? 'bg-emerald-500' : avStatus === 'Injured' ? 'bg-red-500' : avStatus === 'Modified' ? 'bg-amber-500' : 'bg-sky-500';
                      return (
                        <Link key={a.id} href={`/athletes/${a.id}`}
                          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 hover:border-slate-600 transition">
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300">
                            {initials(a.full_name || '?')}
                            <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-slate-950 ${dot}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{a.full_name}</p>
                            <p className="text-[10px] text-slate-500">{a.position || a.age_group || '—'}</p>
                          </div>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0 text-slate-600"><path d="M9 18l6-6-6-6"/></svg>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Attendance leaderboard */}
                {topAttendance.length > 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Leaderboard</p><h2 className="mt-0.5 text-lg font-black text-white">Top Attendance</h2></div>
                    <div className="space-y-2">
                      {topAttendance.map((a, i) => (
                        <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${i === 0 ? 'bg-amber-500/20 text-amber-300' : i === 1 ? 'bg-slate-700 text-slate-300' : i === 2 ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-800 text-slate-500'}`}>{i + 1}</span>
                          <Link href={`/athletes/${a.id}`} className="flex-1 text-sm font-semibold text-white hover:text-sky-300 truncate">{a.full_name}</Link>
                          <span className={`text-sm font-black ${(a.rate ?? 0) >= 90 ? 'text-emerald-400' : (a.rate ?? 0) >= 80 ? 'text-sky-400' : 'text-amber-400'}`}>{a.rate ?? 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No data alert */}
                {noData.length > 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Missing Data</p><h2 className="mt-0.5 text-lg font-black text-white">No Records Yet</h2></div>
                    <div className="space-y-1.5">
                      {noData.map((a) => (
                        <Link key={a.id} href={`/athletes/${a.id}`} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 hover:border-slate-600 transition">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[9px] font-black text-slate-500">{initials(a.full_name || '?')}</div>
                          <p className="text-sm text-slate-400">{a.full_name}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}