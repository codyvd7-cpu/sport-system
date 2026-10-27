'use client';
import * as React from 'react';

// ─── TrainingLoadCard ─────────────────────────────────────────────────────────
// Shows the athlete the training they've actually done, pulled from their
// phone's health store (Apple Health / Google Health Connect) through the
// native app. Six weeks of load as minutes-per-week, this week's totals, recent
// heart rate, and the last few sessions. Renders nothing until there's data —
// so it simply appears once a player connects their watch.

type Row = Record<string, any>;
interface Props { activities: Row[]; C: string }

function localISO(d: Date) { return d.toLocaleDateString('en-CA'); }
const fd = (s: string) => new Date(s).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
const mins = (s?: number | null) => (s ? Math.round(s / 60) : 0);
const titleCase = (t?: string | null) => (t ? t.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Session');

export default function TrainingLoadCard({ activities, C }: Props) {
  if (!activities || activities.length === 0) return null;

  // Monday-start week buckets, six of them, oldest → newest.
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); mon.setHours(0, 0, 0, 0);
  const weeks: { label: string; min: number }[] = [];
  for (let w = 5; w >= 0; w--) {
    const start = new Date(mon); start.setDate(mon.getDate() - w * 7);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    const m = activities
      .filter(a => { const d = new Date(a.start_time); return d >= start && d < end; })
      .reduce((s, a) => s + mins(a.duration_s), 0);
    weeks.push({ label: localISO(start).slice(5), min: m });
  }
  const maxMin = Math.max(1, ...weeks.map(w => w.min));

  const weekStart = new Date(mon);
  const thisWeek = activities.filter(a => new Date(a.start_time) >= weekStart);
  const weekMin = thisWeek.reduce((s, a) => s + mins(a.duration_s), 0);

  const since7 = new Date(Date.now() - 7 * 86400000);
  const hr7 = activities.filter(a => new Date(a.start_time) >= since7 && a.avg_hr).map(a => a.avg_hr as number);
  const avgHr = hr7.length ? Math.round(hr7.reduce((s, n) => s + n, 0) / hr7.length) : null;

  const B = 'rgba(255,255,255,0.08)';
  const stat = (v: React.ReactNode, l: string, c = 'white') => (
    <div style={{ flex: 1, minWidth: 92, textAlign: 'center' }}>
      <p style={{ fontSize: 22, fontWeight: 900, color: c, lineHeight: 1 }}>{v}</p>
      <p style={{ fontSize: 8.5, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 5 }}>{l}</p>
    </div>
  );

  return (
    <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.035)', border: `1px solid ${B}`, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>Training load</p>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>from your watch</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        {stat(thisWeek.length, 'Sessions wk')}
        {stat(weekMin, 'Minutes wk', C)}
        {stat(avgHr ? `${avgHr}` : '—', 'Avg HR 7d', avgHr ? '#f87171' : 'rgba(255,255,255,0.25)')}
      </div>

      {/* 6-week minutes bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 56, marginBottom: 6 }}>
        {weeks.map((w, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ width: '100%', maxWidth: 26, height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: `${(w.min / maxMin) * 100}%`, minHeight: w.min > 0 ? 4 : 0, background: i === weeks.length - 1 ? C : `${C}55`, borderRadius: 6, transition: 'height .7s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: i === weeks.length - 1 ? C : 'rgba(255,255,255,0.22)' }}>{i === weeks.length - 1 ? 'NOW' : ''}</span>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <div style={{ marginTop: 10, paddingTop: 12, borderTop: `1px solid ${B}`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {activities.slice(0, 4).map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titleCase(a.workout_type)}</p>
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>{fd(a.start_time)}</p>
            </div>
            {mins(a.duration_s) > 0 && <span style={{ fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>{mins(a.duration_s)}′</span>}
            {a.avg_hr && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.22)', borderRadius: 7, padding: '2px 8px', flexShrink: 0 }}>{a.avg_hr}bpm</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
