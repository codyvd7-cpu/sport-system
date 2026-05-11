'use client';

import Link from 'next/link';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ code: string }> };

function firstString(...values: any[]) { for (const v of values) { if (typeof v === 'string' && v.trim() !== '') return v.trim(); } return ''; }
function firstNumber(...values: any[]) { for (const v of values) { if (v === null || v === undefined || v === '') continue; const n = Number(v); if (!Number.isNaN(n)) return n; } return null; }
function formatDate(d?: string | null) { if (!d) return '—'; const date = new Date(d); if (Number.isNaN(date.getTime())) return '—'; return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatResult(result: number | null, unit: string) { if (result === null) return '—'; return `${result}${unit ? ` ${unit}` : ''}`; }
function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(); }

const LOWER_IS_BETTER = ['Bronco', '10m Sprint', '30m Sprint', '505'];
const TIERS = [
  { label: 'Elite', color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  { label: 'Good', color: 'text-sky-300', bg: 'bg-sky-500/20', border: 'border-sky-500/30' },
  { label: 'Average', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  { label: 'Developing', color: 'text-orange-300', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { label: 'Poor', color: 'text-red-300', bg: 'bg-red-500/20', border: 'border-red-500/30' },
];
const BENCHMARKS: Record<string, { u1415: number[]; u1618: number[] }> = {
  'SBJ': { u1415: [195, 175, 155, 135], u1618: [215, 195, 175, 155] },
  '10m Sprint': { u1415: [1.72, 1.82, 1.92, 2.02], u1618: [1.65, 1.75, 1.85, 1.95] },
  '30m Sprint': { u1415: [4.25, 4.45, 4.65, 4.85], u1618: [4.05, 4.25, 4.45, 4.65] },
  '505 Left': { u1415: [2.35, 2.50, 2.65, 2.80], u1618: [2.25, 2.40, 2.55, 2.70] },
  '505 Right': { u1415: [2.35, 2.50, 2.65, 2.80], u1618: [2.25, 2.40, 2.55, 2.70] },
  'Push-Ups': { u1415: [40, 30, 20, 10], u1618: [50, 38, 26, 14] },
  'Pull-Ups': { u1415: [10, 7, 4, 1], u1618: [10, 7, 4, 1] },
  'Yo-Yo IR1': { u1415: [1200, 900, 700, 500], u1618: [1600, 1200, 900, 600] },
  'RSA Sdec%': { u1415: [3.0, 5.0, 7.0, 10.0], u1618: [2.5, 4.0, 6.0, 9.0] },
};

function getBenchmarkTier(testKey: string, value: number, ageGroup: string, lowerIsBetter: boolean) {
  const b = BENCHMARKS[testKey]; if (!b) return null;
  const t = ageGroup.includes('14') || ageGroup.includes('15') ? b.u1415 : b.u1618;
  if (lowerIsBetter) { if (value < t[0]) return TIERS[0]; if (value < t[1]) return TIERS[1]; if (value < t[2]) return TIERS[2]; if (value < t[3]) return TIERS[3]; return TIERS[4]; }
  else { if (value > t[0]) return TIERS[0]; if (value > t[1]) return TIERS[1]; if (value > t[2]) return TIERS[2]; if (value > t[3]) return TIERS[3]; return TIERS[4]; }
}

export default function PlayerProfilePage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const code = resolvedParams.code;

  const [athlete, setAthlete] = React.useState<Row | null>(null);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [performance, setPerformance] = React.useState<Row[]>([]);
  const [allAthletes, setAllAthletes] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const { data: ath, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('player_code', code.toUpperCase())
        .single();

      if (error || !ath) { setNotFound(true); setLoading(false); return; }
      setAthlete(ath);

      const [attRes, perfRes, allAthRes] = await Promise.all([
        supabase.from('Attendance').select('*').eq('athlete_id', ath.id).order('session_date', { ascending: false }),
        supabase.from('Performance').select('*').eq('athlete_id', ath.id).order('test_date', { ascending: false }),
        supabase.from('athletes').select('id, name, team').eq('team', ath.team || ath.team_name || ''),
      ]);

      setAttendance(attRes.data || []);
      setPerformance(perfRes.data || []);
      setAllAthletes(allAthRes.data || []);
      setLoading(false);
    }
    load();
  }, [code]);

  const name = athlete ? firstString(athlete.name, athlete.full_name, athlete.athlete_name) || 'Athlete' : '';
  const team = athlete ? firstString(athlete.team, athlete.team_name) || '' : '';
  const ageGroup = athlete ? firstString(athlete.age_group, athlete.agegroup) || '' : '';

  const attendanceSummary = React.useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((r) => r.status?.toLowerCase() === 'present').length;
    const late = attendance.filter((r) => r.status?.toLowerCase() === 'late').length;
    const absent = attendance.filter((r) => r.status?.toLowerCase() === 'absent').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : null;
    return { total, present, late, absent, rate };
  }, [attendance]);

  const performanceTrends = React.useMemo(() => {
    const grouped = new Map<string, Row[]>();
    performance.forEach((r) => { if (!grouped.has(r.test_type)) grouped.set(r.test_type, []); grouped.get(r.test_type)!.push(r); });
    const rows: any[] = [];
    grouped.forEach((entries, testType) => {
      const sorted = [...entries].filter((e) => e.result !== null).sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
      if (!sorted.length) return;
      const latest = sorted[0]; const prev = sorted[1];
      const lowerIsBetter = LOWER_IS_BETTER.some((t) => testType.toLowerCase().includes(t.toLowerCase()));
      const delta = latest.result !== null && prev?.result !== null && prev ? latest.result - prev.result : null;
      const improved = delta !== null && (lowerIsBetter ? delta < 0 : delta > 0);
      const regressed = delta !== null && (lowerIsBetter ? delta > 0 : delta < 0);
      const tier = typeof latest.result === 'number' ? getBenchmarkTier(testType, latest.result, ageGroup, lowerIsBetter) : null;
      rows.push({ testType, latest: latest.result, previous: prev ? prev.result : null, delta, unit: latest.unit, latestDate: latest.test_date, improved, regressed, tier, lowerIsBetter });
    });
    return rows;
  }, [performance, ageGroup]);

  // Team leaderboard position for attendance
  const teamAttLeaderboard = React.useMemo(() => {
    return allAthletes.map((a) => ({ id: a.id, name: firstString(a.name, a.full_name) }));
  }, [allAthletes]);

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-[#06071a]">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading your profile...</p>
      </div>
    </main>
  );

  if (notFound) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#06071a] px-4">
      <span className="text-4xl">🏑</span>
      <p className="mt-4 text-lg font-black text-white">Code not found</p>
      <p className="mt-2 text-sm text-slate-500">Check your code and try again.</p>
      <Link href="/player" className="mt-6 rounded-xl border border-sky-500 bg-sky-500/15 px-5 py-2.5 text-sm font-black text-sky-300">Try Again</Link>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#06071a] text-white">

      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-b from-slate-900/60 to-[#06071a]">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-xl font-black text-sky-400">
              {initials(name)}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-400">St Benedict's Hockey</p>
              <h1 className="text-2xl font-black text-white sm:text-3xl">{name}</h1>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {team && <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">{team}</span>}
                {ageGroup && <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-400">{ageGroup}</span>}
              </div>
            </div>
          </div>

          {/* Key stats */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className={`rounded-2xl border bg-slate-900 p-4 text-center ${attendanceSummary.rate === null ? 'border-slate-700' : attendanceSummary.rate >= 80 ? 'border-emerald-500/20' : attendanceSummary.rate >= 60 ? 'border-amber-500/20' : 'border-red-500/20'}`}>
              <p className={`text-3xl font-black ${attendanceSummary.rate === null ? 'text-slate-500' : attendanceSummary.rate >= 80 ? 'text-emerald-400' : attendanceSummary.rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {attendanceSummary.rate !== null ? `${attendanceSummary.rate}%` : '—'}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Attendance</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-center">
              <p className="text-3xl font-black text-white">{attendanceSummary.total}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sessions</p>
            </div>
            <div className="rounded-2xl border border-violet-500/20 bg-slate-900 p-4 text-center">
              <p className="text-3xl font-black text-violet-400">{performance.length}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Test Records</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6">

        {/* Performance Trends */}
        {performanceTrends.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Your Testing</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Performance Results</h2>
              <p className="mt-1 text-xs text-slate-500">Your latest results vs St Benedict's benchmarks.</p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {TIERS.map((t) => (
                <span key={t.label} className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${t.bg} ${t.border} ${t.color}`}>{t.label}</span>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {performanceTrends.map((trend) => (
                <div key={trend.testType} className={`rounded-xl border p-4 ${trend.tier ? `${trend.tier.bg} ${trend.tier.border}` : 'border-slate-800 bg-slate-950/50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{trend.testType}</p>
                    {trend.tier && (
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${trend.tier.bg} ${trend.tier.color}`}>{trend.tier.label}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p className="text-2xl font-black text-white">{formatResult(trend.latest, trend.unit)}</p>
                    {trend.delta !== null && (
                      <span className={`mb-0.5 rounded-full px-2.5 py-1 text-xs font-black ${trend.improved ? 'bg-emerald-500/15 text-emerald-300' : trend.regressed ? 'bg-red-500/15 text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                        {trend.improved ? `↑` : trend.regressed ? `↓` : `→`} {Math.abs(trend.delta)}{trend.unit ? ` ${trend.unit}` : ''}
                      </span>
                    )}
                  </div>
                  {trend.previous !== null && <p className="mt-1 text-[11px] text-slate-600">Prev: {formatResult(trend.previous, trend.unit)}</p>}
                  <p className="mt-1 text-[10px] text-slate-600">{formatDate(trend.latestDate)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Sessions</p>
            <h2 className="mt-0.5 text-lg font-black text-white">Attendance</h2>
          </div>

          {/* Rate bar */}
          {attendanceSummary.rate !== null && (
            <div className="mb-5">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-slate-400">Attendance rate</span>
                <span className={`font-black ${attendanceSummary.rate >= 80 ? 'text-emerald-400' : attendanceSummary.rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{attendanceSummary.rate}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full transition-all ${attendanceSummary.rate >= 80 ? 'bg-emerald-500' : attendanceSummary.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${attendanceSummary.rate}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-emerald-500/10 px-2 py-2"><p className="text-lg font-black text-emerald-400">{attendanceSummary.present}</p><p className="text-[10px] text-slate-500">Present</p></div>
                <div className="rounded-xl bg-amber-500/10 px-2 py-2"><p className="text-lg font-black text-amber-400">{attendanceSummary.late}</p><p className="text-[10px] text-slate-500">Late</p></div>
                <div className="rounded-xl bg-red-500/10 px-2 py-2"><p className="text-lg font-black text-red-400">{attendanceSummary.absent}</p><p className="text-[10px] text-slate-500">Absent</p></div>
              </div>
            </div>
          )}

          {attendance.length === 0 ? (
            <p className="text-sm text-slate-500">No attendance records yet.</p>
          ) : (
            <div className="space-y-2">
              {attendance.slice(0, 15).map((record, i) => {
                const s = (record.status || '').toLowerCase();
                const cls = s === 'present' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : s === 'late' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : s === 'absent' ? 'bg-red-500/15 text-red-300 border-red-500/20' : 'bg-sky-500/15 text-sky-300 border-sky-500/20';
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${cls}`}>{record.status}</span>
                    <p className="flex-1 text-sm text-slate-300">{record.session_type}</p>
                    <p className="text-xs text-slate-500">{formatDate(record.session_date)}</p>
                  </div>
                );
              })}
              {attendance.length > 15 && <p className="text-center text-xs text-slate-600">Showing 15 of {attendance.length} records</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pb-8 text-center">
          <p className="text-xs text-slate-700">St Benedict's College Hockey · Player Portal</p>
          <Link href="/player" className="mt-2 inline-block text-xs text-slate-600 hover:text-slate-400">← Back to code entry</Link>
        </div>

      </div>
    </main>
  );
}