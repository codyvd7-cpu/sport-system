'use client';
import * as React from 'react';

// Self-contained fixture-day weather chip. Fetches /api/weather?date=YYYY-MM-DD,
// renders nothing when out of forecast range or on any failure — decorative only.
export default function WeatherChip({ date, color = '#38bdf8', style }: { date?: string | null; color?: string; style?: React.CSSProperties; [k: string]: any }) {
  const [w, setW] = React.useState<any>(null);

  React.useEffect(() => {
    setW(null);
    if (!date) return;
    let cancelled = false;
    fetch(`/api/weather?date=${date}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setW(d.weather || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [date]);

  if (!w) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 11,
      background: w.storm ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.035)',
      border: `1px solid ${w.storm ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.09)'}`,
      ...style,
    }}>
      <span style={{ fontSize: 15 }}>{w.icon}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
        {w.label} · {w.tMax}°{w.tMin != null ? `/${w.tMin}°` : ''}
        {w.rain != null && w.rain > 15 ? ` · ${w.rain}% rain` : ''}
      </span>
      {w.storm && <span style={{ fontSize: 9, fontWeight: 900, color: '#fbbf24', letterSpacing: '0.06em' }}>STORM RISK</span>}
    </span>
  );
}
