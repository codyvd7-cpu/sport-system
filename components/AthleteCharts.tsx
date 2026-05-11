'use client';

import { useState, useMemo } from 'react';

type Row = Record<string, any>;

const LOWER_IS_BETTER = ['Bronco', '10m Sprint', '30m Sprint', '505', 'RSA'];

function formatDate(d?: string | null) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export function PerformanceTrendChart({ records }: { records: Row[] }) {
  const testTypes = useMemo(() =>
    Array.from(new Set(records.map((r) => r.test_type))).sort(), [records]);
  const [selectedTest, setSelectedTest] = useState(testTypes[0] || '');
  const [hovered, setHovered] = useState<number | null>(null);

  const data = useMemo(() =>
    records
      .filter((r) => r.test_type === selectedTest && r.result !== null)
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime())
      .map((r) => ({ date: formatDate(r.test_date), value: Number(r.result), unit: r.unit || '' })),
    [records, selectedTest]);

  const lowerIsBetter = LOWER_IS_BETTER.some((t) => selectedTest.toLowerCase().includes(t.toLowerCase()));

  if (testTypes.length === 0) return null;

  const W = 500; const H = 160;
  const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const values = data.map((d) => d.value);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 10;
  const range = maxVal - minVal || 1;
  const pad = range * 0.25;
  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const toY = (v: number) => PAD.top + innerH - ((v - (minVal - pad)) / (range + pad * 2)) * innerH;
  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.value).toFixed(1)}`).join(' ');

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Progress Over Time</p>
          <h2 className="mt-0.5 text-lg font-black text-white">Performance Trend</h2>
          {lowerIsBetter && <p className="mt-0.5 text-[10px] text-slate-500">↓ Lower is better</p>}
        </div>
        <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500 sm:w-44">
          {testTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {data.length < 2 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/50">
          <p className="text-sm text-slate-500">Need at least 2 results to show a trend.</p>
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
            <defs>
              <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 0.33, 0.66, 1].map((t) => {
              const y = PAD.top + t * innerH;
              const val = (minVal - pad) + (1 - t) * (range + pad * 2);
              return (
                <g key={t}>
                  <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1e293b" strokeWidth={1} />
                  <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#475569">
                    {Math.round(val * 10) / 10}
                  </text>
                </g>
              );
            })}
            <path d={`${pathD} L ${toX(data.length - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${PAD.left} ${(PAD.top + innerH).toFixed(1)} Z`}
              fill="url(#lg1)" />
            <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {data.map((d, i) => (
              <g key={i} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                <circle cx={toX(i)} cy={toY(d.value)} r={hovered === i ? 6 : 4}
                  fill={hovered === i ? '#a78bfa' : '#7c3aed'} stroke="#0f172a" strokeWidth={2} />
                {(i === 0 || i === data.length - 1 || hovered === i) && (
                  <text x={toX(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#64748b">{d.date}</text>
                )}
                {hovered === i && (
                  <g>
                    <rect x={toX(i) - 28} y={toY(d.value) - 26} width={56} height={20} rx={4} fill="#1e293b" stroke="#334155" />
                    <text x={toX(i)} y={toY(d.value) - 12} textAnchor="middle" fontSize={10} fill="white" fontWeight="bold">
                      {d.value}{d.unit}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </svg>

          {(() => {
            const first = data[0].value;
            const last = data[data.length - 1].value;
            const delta = Math.round((last - first) * 100) / 100;
            const improved = lowerIsBetter ? delta < 0 : delta > 0;
            const unit = data[0].unit;
            return (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <span className={`text-2xl font-black ${improved ? 'text-emerald-400' : delta === 0 ? 'text-slate-400' : 'text-red-400'}`}>
                  {improved ? '↑' : delta === 0 ? '→' : '↓'}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{improved ? 'Improving' : delta === 0 ? 'No change' : 'Declining'}</p>
                  <p className="text-xs text-slate-500">{first}{unit} → {last}{unit} ({delta > 0 ? '+' : ''}{delta}{unit} overall)</p>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

export function AttendanceChart({ records }: { records: Row[] }) {
  const weeklyData = useMemo(() => {
    const sorted = [...records].sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
    const map = new Map<string, { present: number; absent: number; late: number; excused: number }>();
    sorted.forEach((r) => {
      const d = new Date(r.session_date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
      if (!map.has(key)) map.set(key, { present: 0, absent: 0, late: 0, excused: 0 });
      const e = map.get(key)!;
      const s = r.status?.toLowerCase() || '';
      if (s === 'present') e.present++; else if (s === 'absent') e.absent++;
      else if (s === 'late') e.late++; else if (s === 'excused') e.excused++;
    });
    return Array.from(map.entries()).slice(-10).map(([week, c]) => ({ week, ...c, total: c.present + c.absent + c.late + c.excused }));
  }, [records]);

  const sessionTypes = useMemo(() => {
    const m = records.reduce((acc, r) => { const t = r.session_type || 'Unknown'; acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [records]);

  if (records.length === 0) return null;

  const maxTotal = Math.max(...weeklyData.map((w) => w.total), 1);
  const W = 500; const H = 120;
  const PAD = { top: 8, right: 8, bottom: 24, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slotW = weeklyData.length > 0 ? innerW / weeklyData.length : 0;
  const barW = slotW * 0.6;
  const barOffset = slotW * 0.2;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Attendance Analytics</p>
        <h2 className="mt-0.5 text-lg font-black text-white">Session Breakdown</h2>
      </div>

      {weeklyData.length >= 2 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold text-slate-500">Weekly sessions (last 10 weeks)</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
            {weeklyData.map((week, i) => {
              const x = PAD.left + i * slotW + barOffset;
              const bars = [
                { value: week.present, color: '#10b981' },
                { value: week.late, color: '#f59e0b' },
                { value: week.excused, color: '#0ea5e9' },
                { value: week.absent, color: '#ef4444' },
              ];
              let stackY = PAD.top + innerH;
              return (
                <g key={i}>
                  {bars.map((bar, j) => {
                    if (!bar.value) return null;
                    const bh = (bar.value / maxTotal) * innerH;
                    stackY -= bh;
                    return <rect key={j} x={x} y={stackY} width={barW} height={bh} fill={bar.color} opacity={0.8} />;
                  })}
                  <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={8} fill="#475569">{week.week}</text>
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex flex-wrap gap-3">
            {[{ l: 'Present', c: 'bg-emerald-500' }, { l: 'Late', c: 'bg-amber-500' }, { l: 'Excused', c: 'bg-sky-500' }, { l: 'Absent', c: 'bg-red-500' }].map((x) => (
              <div key={x.l} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${x.c}`} />
                <span className="text-[10px] text-slate-500">{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-semibold text-slate-500">By session type</p>
        <div className="space-y-2">
          {sessionTypes.map(([name, count]) => {
            const pct = Math.round((count / records.length) * 100);
            return (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">{name}</span>
                  <span className="text-slate-500">{count} · {pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

export function BenchmarkBars({ trends, ageGroup }: { trends: { testType: string; latest: number | null; unit: string }[]; ageGroup: string }) {
  const hasBenchmarks = trends.some((t) => BENCHMARKS[t.testType]);
  if (!hasBenchmarks) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Fitness Profile</p>
        <h2 className="mt-0.5 text-lg font-black text-white">Benchmark Position</h2>
        <p className="mt-1 text-xs text-slate-500">Where this athlete sits vs St Benedict's standards.</p>
      </div>
      <div className="space-y-4">
        {trends.filter((t) => BENCHMARKS[t.testType] && t.latest !== null).map((trend) => {
          const b = BENCHMARKS[trend.testType];
          const lower = LOWER_IS_BETTER.some((t) => trend.testType.toLowerCase().includes(t.toLowerCase()));
          const thresholds = ageGroup.includes('14') || ageGroup.includes('15') ? b.u1415 : b.u1618;
          const value = trend.latest!;
          const worst = thresholds[3]; const elite = thresholds[0];
          let pct: number;
          if (lower) { const r = worst - elite; pct = r > 0 ? Math.max(0, Math.min(100, ((worst - value) / r) * 100)) : 50; }
          else { const r = elite - worst; pct = r > 0 ? Math.max(0, Math.min(100, ((value - worst) / r) * 100)) : 50; }
          const tierColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-sky-500' : pct >= 40 ? 'bg-amber-500' : pct >= 20 ? 'bg-orange-500' : 'bg-red-500';
          const tierLabel = pct >= 80 ? 'Elite' : pct >= 60 ? 'Good' : pct >= 40 ? 'Average' : pct >= 20 ? 'Developing' : 'Poor';
          const tierTextColor = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-sky-400' : pct >= 40 ? 'text-amber-400' : pct >= 20 ? 'text-orange-400' : 'text-red-400';
          return (
            <div key={trend.testType}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">{trend.testType}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{value}{trend.unit}</span>
                  <span className={`text-[10px] font-black ${tierTextColor}`}>{tierLabel}</span>
                </div>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="absolute inset-0 flex">
                  {['bg-red-500/15','bg-orange-500/15','bg-amber-500/15','bg-sky-500/15','bg-emerald-500/15'].map((c, i) => (
                    <div key={i} className={`h-full flex-1 ${c}`} />
                  ))}
                </div>
                <div className={`absolute top-0 h-full rounded-full ${tierColor}`} style={{ width: `${Math.max(4, pct)}%`, opacity: 0.9 }} />
              </div>
              <div className="mt-0.5 flex justify-between text-[9px] text-slate-700">
                <span>Poor</span><span>Developing</span><span>Average</span><span>Good</span><span>Elite</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}