'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

// ─── TeamPulse ────────────────────────────────────────────────────────────────
// The live intelligence strip on the coach dashboard: today's weather, alert
// status, who's checked in at the gym today, and who's been training this
// week. One pulse fetch + one weather fetch; quiet cards, one live-dot accent.

type Checkin = { name: string; venue: string; time: string };
type WorkoutRow = { name: string; days: number };
type Pulse = {
  checkinsToday: Checkin[];
  workoutWeek: WorkoutRow[];
  workoutAthletes: number;
  alert: { type: string; message: string } | null;
};
type Weather = { icon?: string; label?: string; tMax?: number; tMin?: number; rain?: number | null } | null;

const surname = (n: string) => (n || '').split(' ').pop();

function Card({ children, tone }: { children: React.ReactNode; tone?: 'alert' | null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4"
      style={{
        background: tone === 'alert' ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.015)',
        borderColor: tone === 'alert' ? 'rgba(220,38,38,0.35)' : 'rgba(255,255,255,0.06)',
      }}>
      {children}
    </div>
  );
}

function CardLabel({ children, live, accent }: { children: React.ReactNode; live?: boolean; accent?: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
      {live && <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: '#34d399' }} />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: '#34d399' }} />
      </span>}
      {children}
    </p>
  );
}

export default function TeamPulse({ team, accent }: { team: string; accent: string }) {
  const [pulse, setPulse] = React.useState<Pulse | null>(null);
  const [weather, setWeather] = React.useState<Weather>(null);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const today = new Date().toLocaleDateString('en-CA');
        const [pulseRes, weatherRes] = await Promise.all([
          fetch(`/api/coach/pulse?team=${encodeURIComponent(team)}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`/api/weather?date=${today}`),
        ]);
        const p = await pulseRes.json();
        const w = await weatherRes.json();
        if (!stop) {
          if (pulseRes.ok) setPulse(p);
          setWeather(w.weather || null);
        }
      } catch {}
    })();
    return () => { stop = true; };
  }, [team]);

  if (!pulse) return null; // no skeletons for a supplementary strip — appears when ready

  const gym = pulse.checkinsToday;
  const week = pulse.workoutWeek;

  return (
    <div className="space-y-3">
      {/* Active alert banner — full width, impossible to miss */}
      {pulse.alert && (
        <Card tone="alert">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#fca5a5' }}>Alert active now</p>
              <p className="truncate text-[13px] font-bold text-white">{pulse.alert.message}</p>
            </div>
            <a href="/lightning" className="shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold"
              style={{ borderColor: 'rgba(220,38,38,0.4)', color: '#fca5a5' }}>Manage</a>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {/* Weather */}
        <Card>
          <CardLabel>Today&apos;s forecast</CardLabel>
          {weather ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{weather.icon || '☀️'}</span>
              <div>
                <p className="text-[15px] font-black leading-tight text-white">
                  {weather.tMax != null ? `${weather.tMax}°` : '—'}
                  {weather.tMin != null && <span className="ml-1 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>{weather.tMin}°</span>}
                </p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {weather.label}{weather.rain != null && weather.rain > 0 ? ` · ${weather.rain}% rain` : ''}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No forecast available.</p>
          )}
        </Card>

        {/* Gym today */}
        <Card>
          <CardLabel live={gym.length > 0} accent={accent}>Gym today</CardLabel>
          <p className="text-[15px] font-black leading-tight text-white">
            {gym.length}
            <span className="ml-1.5 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>checked in</span>
          </p>
          <p className="mt-0.5 truncate text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {gym.length === 0 ? 'No check-ins yet today.' : gym.slice(0, 3).map(c => `${surname(c.name)} ${c.time}`).join(' · ') + (gym.length > 3 ? ` +${gym.length - 3}` : '')}
          </p>
        </Card>

        {/* Training this week */}
        <Card>
          <CardLabel>Training this week</CardLabel>
          <p className="text-[15px] font-black leading-tight text-white">
            {pulse.workoutAthletes}
            <span className="ml-1.5 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>logging workouts</span>
          </p>
          <p className="mt-0.5 truncate text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {week.length === 0
              ? 'No workouts logged yet this week.'
              : week.slice(0, 3).map(r => `${surname(r.name)} ×${r.days}`).join(' · ')}
          </p>
        </Card>
      </div>
    </div>
  );
}
