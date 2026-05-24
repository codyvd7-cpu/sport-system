'use client';

import Link from 'next/link';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ code: string }> };

// ── CONSTANTS ─────────────────────────────────────────────────
const LOWER_IS_BETTER = ['Bronco', '10m Sprint', '30m Sprint', '505', 'RSA'];
const BENCHMARKS: Record<string, { u1415: number[]; u1618: number[] }> = {
  'SBJ':        { u1415: [195,175,155,135], u1618: [215,195,175,155] },
  '10m Sprint': { u1415: [1.72,1.82,1.92,2.02], u1618: [1.65,1.75,1.85,1.95] },
  '30m Sprint': { u1415: [4.25,4.45,4.65,4.85], u1618: [4.05,4.25,4.45,4.65] },
  '505 Left':   { u1415: [2.35,2.50,2.65,2.80], u1618: [2.25,2.40,2.55,2.70] },
  '505 Right':  { u1415: [2.35,2.50,2.65,2.80], u1618: [2.25,2.40,2.55,2.70] },
  'Push-Ups':   { u1415: [40,30,20,10], u1618: [50,38,26,14] },
  'Pull-Ups':   { u1415: [10,7,4,1], u1618: [10,7,4,1] },
  'Yo-Yo IR1':  { u1415: [1200,900,700,500], u1618: [1600,1200,900,600] },
  'RSA Sdec%':  { u1415: [3.0,5.0,7.0,10.0], u1618: [2.5,4.0,6.0,9.0] },
};
const TEST_DESCRIPTIONS: Record<string, string> = {
  'SBJ': 'Lower body explosive power',
  '10m Sprint': 'Acceleration speed',
  '30m Sprint': 'Maximum speed',
  '505 Left': 'Change of direction (left)',
  '505 Right': 'Change of direction (right)',
  'Push-Ups': 'Upper body muscular endurance',
  'Pull-Ups': 'Upper body pulling strength',
  'Yo-Yo IR1': 'Aerobic fitness',
  'RSA Sdec%': 'Fatigue resistance under repeated sprints',
  'Bronco': 'Aerobic capacity and running fitness',
};
const TIERS = [
  { label: 'Elite',      color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
  { label: 'Good',       color: 'text-sky-300',     bg: 'bg-sky-500/20',     border: 'border-sky-500/40' },
  { label: 'Average',    color: 'text-amber-300',   bg: 'bg-amber-500/20',   border: 'border-amber-500/40' },
  { label: 'Developing', color: 'text-orange-300',  bg: 'bg-orange-500/20',  border: 'border-orange-500/40' },
  { label: 'Poor',       color: 'text-red-300',     bg: 'bg-red-500/20',     border: 'border-red-500/40' },
];

// ── UTILS ──────────────────────────────────────────────────────
function getBenchmarkTier(testKey: string, value: number, ag: string) {
  const b = BENCHMARKS[testKey]; if (!b) return null;
  const lower = LOWER_IS_BETTER.some((t) => testKey.toLowerCase().includes(t.toLowerCase()));
  const t = ag.includes('14') || ag.includes('15') ? b.u1415 : b.u1618;
  if (lower) { if (value < t[0]) return TIERS[0]; if (value < t[1]) return TIERS[1]; if (value < t[2]) return TIERS[2]; if (value < t[3]) return TIERS[3]; return TIERS[4]; }
  else { if (value > t[0]) return TIERS[0]; if (value > t[1]) return TIERS[1]; if (value > t[2]) return TIERS[2]; if (value > t[3]) return TIERS[3]; return TIERS[4]; }
}
function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(); }
function formatDate(d?: string | null) { if (!d) return '—'; const date = new Date(d); if (Number.isNaN(date.getTime())) return '—'; return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }); }

// ── SUB-COMPONENTS ────────────────────────────────────────────
function AttendanceRing({ rate }: { rate: number | null }) {
  const r = 36; const circ = 2 * Math.PI * r;
  const pct = rate ?? 0; const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="text-center">
        <p className="text-lg font-black text-white leading-none">{rate !== null ? `${rate}%` : '—'}</p>
        <p className="text-[9px] text-slate-500 uppercase tracking-wide">Att.</p>
      </div>
    </div>
  );
}

function Sparkline({ values, lower }: { values: number[]; lower: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const W = 80; const H = 28;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ');
  const improved = lower ? values[values.length-1] < values[0] : values[values.length-1] > values[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-7" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={improved ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
export default function PlayerProfilePage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const code = resolvedParams.code;

  const [athlete, setAthlete] = React.useState<Row | null>(null);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [performance, setPerformance] = React.useState<Row[]>([]);
  const [notes, setNotes] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  const [coachName, setCoachName] = React.useState('');

  React.useEffect(() => {
    async function load() {
      const { data: ath, error } = await supabase.from('athletes').select('*').eq('player_code', code.toUpperCase()).single();
      if (error || !ath) { setNotFound(true); setLoading(false); return; }
      setAthlete(ath);
      const [attRes, perfRes, notesRes, coachRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('athlete_id', ath.id).order('session_date', { ascending: false }),
        supabase.from('performance_tests').select('*').eq('athlete_id', ath.id).order('test_date', { ascending: false }),
        supabase.from('coach_notes').select('*').eq('athlete_id', ath.id).eq('is_feedback', true).order('created_at', { ascending: false }).limit(1),
        supabase.from('staff_roles').select('full_name,email,teams').eq('role', 'coach').eq('is_active', true),
      ]);
      setAttendance(attRes.data || []);
      setPerformance(perfRes.data || []);
      setNotes(notesRes.data || []);
      // Find coach for this athlete's team
      const teamCoach = (coachRes.data || []).find(c => Array.isArray(c.teams) && c.teams.includes(ath.team));
      if (teamCoach) {
        setCoachName(teamCoach.full_name || teamCoach.email.split('@')[0].replace(/[._]/g, ' '));
      }
      setLoading(false);
    }
    load();
  }, [code]);

  const name = athlete ? (athlete.full_name || athlete.name || 'Athlete') : '';
  const team = athlete ? (athlete.team || '') : '';
  const ageGroup = athlete ? (athlete.age_group || '') : '';
  const availability = athlete?.availability || 'Available';
  const position = athlete?.position || '';

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
      const sorted = [...entries].filter((e) => e.value !== null).sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
      if (!sorted.length) return;
      const latest = sorted[0]; const prev = sorted[1];
      const lower = LOWER_IS_BETTER.some((t) => testType.toLowerCase().includes(t.toLowerCase()));
      const delta = latest.value !== null && prev?.value !== null && prev ? latest.value - prev.value : null;
      const improved = delta !== null && (lower ? delta < 0 : delta > 0);
      const tier = typeof latest.value === 'number' ? getBenchmarkTier(testType, latest.value, ageGroup) : null;
      const allValues = sorted.map((e: Row) => e.value).reverse();
      rows.push({ testType, latest: latest.value, previous: prev?.value ?? null, delta, unit: latest.unit || '', latestDate: latest.test_date, improved, tier, lower, allValues });
    });
    return rows;
  }, [performance, ageGroup]);

  const personalBests = React.useMemo(() => {
    const grouped = new Map<string, number[]>();
    performance.forEach((r) => { if (r.value === null) return; if (!grouped.has(r.test_type)) grouped.set(r.test_type, []); grouped.get(r.test_type)!.push(r.value); });
    const pbs: { testType: string; pb: number; unit: string }[] = [];
    grouped.forEach((values, testType) => {
      const lower = LOWER_IS_BETTER.some((t) => testType.toLowerCase().includes(t.toLowerCase()));
      const pb = lower ? Math.min(...values) : Math.max(...values);
      const unit = performance.find((r) => r.test_type === testType)?.unit || '';
      pbs.push({ testType, pb, unit });
    });
    return pbs;
  }, [performance]);

  const latestFeedback = notes[0] || null;

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-[#06071a]">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading your profile...</p>
      </div>
    </main>
  );

  if (notFound) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#06071a] px-4">
      <span className="text-5xl"></span>
      <p className="mt-4 text-lg font-black text-white">Code not found</p>
      <p className="mt-2 text-sm text-slate-500">Check your code and try again.</p>
      <Link href="/player" className="mt-6 rounded-xl border border-sky-500 bg-sky-500/15 px-5 py-2.5 text-sm font-black text-sky-300">Try Again</Link>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#06071a] text-white">

      {/* HERO */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 to-[#06071a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_50%,rgba(14,165,233,0.06),transparent)]" />

        <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6">

          {/* School header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl"></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-400">St Benedict's College</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-600">Hockey Department</p>
              </div>
            </div>
            <Link href="/portal" className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition">Team Portal →</Link>
          </div>

          {/* Profile */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="flex h-18 w-18 h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/30 to-sky-500/10 text-xl font-black text-sky-300">{initials(name)}</div>
                <div className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#06071a] ${availability === 'Available' ? 'bg-emerald-500' : availability === 'Injured' ? 'bg-red-500' : availability === 'Modified' ? 'bg-amber-500' : 'bg-sky-500'}`}>
                  {availability === 'Available' ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="h-3 w-3"><path d="M5 13l4 4L19 7"/></svg> : <span className="text-[8px] font-black text-white">{availability[0]}</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">My Profile</p>
                <h1 className="mt-0.5 text-2xl font-black tracking-tight text-white sm:text-3xl">{name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {team && <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-black text-sky-300">{team}</span>}
                  {ageGroup && <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">{ageGroup}</span>}
                  {position && <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">{position}</span>}
                  {coachName && <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">Coach: {coachName}</span>}
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${availability === 'Available' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : availability === 'Injured' ? 'bg-red-500/15 text-red-300 border-red-500/30' : availability === 'Modified' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-sky-500/15 text-sky-300 border-sky-500/30'}`}>{availability}</span>
                </div>
              </div>
            </div>
            <AttendanceRing rate={attendanceSummary.rate} />
          </div>

          {/* KPI cards */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Sessions', value: attendanceSummary.total, sub: `${attendanceSummary.present} present`, color: attendanceSummary.rate !== null && attendanceSummary.rate >= 80 ? 'emerald' : 'sky' },
              { label: 'Absences', value: attendanceSummary.absent, sub: 'this season', color: attendanceSummary.absent > 3 ? 'red' : 'slate' },
              { label: 'Test Records', value: performance.length, sub: `${performanceTrends.length} tests`, color: 'violet' },
            ].map((kpi) => (
              <div key={kpi.label} className={`rounded-2xl border bg-slate-900/80 p-4 ${kpi.color === 'emerald' ? 'border-emerald-500/20' : kpi.color === 'sky' ? 'border-sky-500/20' : kpi.color === 'red' ? 'border-red-500/20' : kpi.color === 'violet' ? 'border-violet-500/20' : 'border-slate-800'}`}>
                <p className={`text-3xl font-black ${kpi.color === 'emerald' ? 'text-emerald-400' : kpi.color === 'sky' ? 'text-sky-400' : kpi.color === 'red' ? 'text-red-400' : kpi.color === 'violet' ? 'text-violet-400' : 'text-white'}`}>{kpi.value}</p>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{kpi.label}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">

        {/* Empty state */}
        {performanceTrends.length === 0 && attendanceSummary.total === 0 && !latestFeedback && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-4xl mb-3"></p>
            <p className="text-lg font-black text-white">Your season profile is being built</p>
            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">As your coach logs attendance and testing data, your performance profile will appear here.</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-left">
              {[{ icon: '', t: 'Attendance', d: 'Every session' }, { icon: '', t: 'Testing', d: 'Benchmarks' }, { icon: '', t: 'Trends', d: 'Your progress' }].map((item) => (
                <div key={item.t} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-xl mb-1">{item.icon}</p>
                  <p className="text-xs font-black text-white">{item.t}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coach Feedback */}
        {latestFeedback && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">From Your Coach</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Latest Feedback</h2>
            </div>
            <div className="space-y-3">
              {latestFeedback.strengths && (
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-emerald-400">Strengths</p>
                  <p className="text-sm leading-relaxed text-slate-200">{latestFeedback.strengths}</p>
                </div>
              )}
              {latestFeedback.current_focus && (
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-amber-400">Current Focus</p>
                  <p className="text-sm leading-relaxed text-slate-200">{latestFeedback.current_focus}</p>
                </div>
              )}
              {latestFeedback.coach_comment && (
                <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Comment</p>
                  <p className="text-sm leading-relaxed text-slate-200 italic">"{latestFeedback.coach_comment}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Personal Bests */}
        {personalBests.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">My Records</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Personal Bests</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {personalBests.map((pb) => {
                const trend = performanceTrends.find((t) => t.testType === pb.testType);
                const tier = getBenchmarkTier(pb.testType, pb.pb, ageGroup);
                const lower = LOWER_IS_BETTER.some((t) => pb.testType.toLowerCase().includes(t.toLowerCase()));
                return (
                  <div key={pb.testType} className={`rounded-xl border p-4 ${tier ? `${tier.bg} ${tier.border}` : 'border-slate-800 bg-slate-950/50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{pb.testType}</p>
                        {TEST_DESCRIPTIONS[pb.testType] && <p className="mt-0.5 text-[9px] text-slate-600">{TEST_DESCRIPTIONS[pb.testType]}</p>}
                      </div>
                      {tier && <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.border} ${tier.color}`}>{tier.label}</span>}
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">PB</p>
                        <p className="text-2xl font-black text-white">{pb.pb}{pb.unit}</p>
                        {trend?.delta !== null && trend?.delta !== undefined && (
                          <p className={`text-xs font-bold ${trend.improved ? 'text-emerald-400' : 'text-red-400'}`}>{trend.improved ? '↑' : '↓'} {Math.abs(trend.delta)}{pb.unit}</p>
                        )}
                      </div>
                      {trend && <Sparkline values={trend.allValues} lower={lower} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Benchmark Position */}
        {performanceTrends.filter((t) => BENCHMARKS[t.testType]).length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">How I Compare</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Benchmark Position</h2>
              <p className="mt-1 text-xs text-slate-500">vs St Benedict's standards for {ageGroup}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{TIERS.map((t) => <span key={t.label} className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${t.bg} ${t.border} ${t.color}`}>{t.label}</span>)}</div>
            </div>
            <div className="space-y-4">
              {performanceTrends.filter((t) => BENCHMARKS[t.testType] && t.latest !== null).map((trend) => {
                const tier = getBenchmarkTier(trend.testType, trend.latest!, ageGroup);
                const b = BENCHMARKS[trend.testType];
                const lower = trend.lower;
                const thr = ageGroup.includes('14') || ageGroup.includes('15') ? b.u1415 : b.u1618;
                const pct = lower ? Math.max(0, Math.min(100, ((thr[3] - trend.latest!) / (thr[3] - thr[0])) * 100)) : Math.max(0, Math.min(100, ((trend.latest! - thr[3]) / (thr[0] - thr[3])) * 100));
                const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-sky-500' : pct >= 40 ? 'bg-amber-500' : pct >= 20 ? 'bg-orange-500' : 'bg-red-500';
                return (
                  <div key={trend.testType}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">{trend.testType}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{trend.latest}{trend.unit}</span>
                        {tier && <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${tier.bg} ${tier.border} ${tier.color}`}>{tier.label}</span>}
                      </div>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className="absolute inset-0 flex">{['bg-red-500/15','bg-orange-500/15','bg-amber-500/15','bg-sky-500/15','bg-emerald-500/15'].map((c,i) => <div key={i} className={`h-full flex-1 ${c}`} />)}</div>
                      <div className={`absolute top-0 h-full rounded-full ${barColor}`} style={{ width: `${Math.max(4, pct)}%` }} />
                    </div>
                    <div className="mt-0.5 flex justify-between text-[9px] text-slate-700"><span>Poor</span><span>Developing</span><span>Average</span><span>Good</span><span>Elite</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attendance */}
        {attendanceSummary.total > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">My Commitment</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Attendance</h2>
            </div>
            {attendanceSummary.rate !== null && (
              <div className="mb-5">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-slate-500">Attendance rate</span>
                  <span className={`font-black ${attendanceSummary.rate >= 80 ? 'text-emerald-400' : attendanceSummary.rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{attendanceSummary.rate}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full ${attendanceSummary.rate >= 80 ? 'bg-emerald-500' : attendanceSummary.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${attendanceSummary.rate}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-500/10 p-2"><p className="text-lg font-black text-emerald-400">{attendanceSummary.present}</p><p className="text-[10px] text-slate-500">Present</p></div>
                  <div className="rounded-xl bg-red-500/10 p-2"><p className="text-lg font-black text-red-400">{attendanceSummary.absent}</p><p className="text-[10px] text-slate-500">Absent</p></div>
                  <div className="rounded-xl bg-slate-800 p-2"><p className="text-lg font-black text-white">{attendanceSummary.total}</p><p className="text-[10px] text-slate-500">Total</p></div>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {attendance.slice(0, 10).map((record, i) => {
                const s = record.status?.toLowerCase() || '';
                const cls = s === 'present' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : s === 'late' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : s === 'absent' ? 'bg-red-500/15 text-red-300 border-red-500/20' : 'bg-sky-500/15 text-sky-300 border-sky-500/20';
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-black ${cls}`}>{record.status}</span>
                    <p className="flex-1 text-sm text-slate-300">{record.session_type}</p>
                    <p className="text-xs text-slate-500">{formatDate(record.session_date)}</p>
                  </div>
                );
              })}
              {attendance.length > 10 && <p className="text-center text-xs text-slate-600">+{attendance.length - 10} more sessions</p>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pb-6 text-center space-y-2">
          <p className="text-xs text-slate-700">St Benedict's College Hockey · Player Portal</p>
          <Link href="/player" className="inline-block text-xs text-slate-600 hover:text-slate-400">← Back to code entry</Link>
        </div>
      </div>
    </main>
  );
}
