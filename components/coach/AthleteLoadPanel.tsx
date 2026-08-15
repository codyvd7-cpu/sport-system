'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── AthleteLoadPanel ──────────────────────────────────────────────────────────
// This athlete's training load: the sessions a coach has captured on the
// dashboard's "Session RPE" tab, read back here as a weekly trend + a log.
//
// Deliberately plain sums, not an acute:chronic ratio or a "risk" figure —
// see the note on /api/athlete/load. This is a record of what was done.

type Session = {
  id: string; session_date: string; session_type: string;
  rpe: number; duration_min: number; load_au: number; note: string | null;
};
type Week = { weekStart: string; load: number };

function rpeColour(v: number) {
  if (v <= 3) return '#34d399';
  if (v <= 6) return '#fbbf24';
  if (v <= 8) return '#fb923c';
  return '#f87171';
}

export default function AthleteLoadPanel({ athleteId, accent = '#38bdf8' }: { athleteId: string; accent?: string }) {
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [weekly, setWeekly] = React.useState<Week[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const res = await fetch(`/api/athlete/load?athleteId=${athleteId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !stop) {
          const d = await res.json();
          setSessions(d.sessions || []); setWeekly(d.weekly || []);
        }
      } catch { /* panel just doesn't render */ }
      if (!stop) setLoading(false);
    })();
    return () => { stop = true; };
  }, [athleteId]);

  if (loading) return null;

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-5">
        <p className="text-[12.5px] text-white/45">No session load recorded yet.</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/25">
          Coaches capture RPE for the whole squad from the dashboard, right after a session.
        </p>
        <Link href="/dashboard" className="mt-2.5 inline-block text-[11.5px] font-bold" style={{ color: accent }}>
          Dashboard →
        </Link>
      </div>
    );
  }

  const maxWeekly = Math.max(1, ...weekly.map(w => w.load));

  return (
    <div className="space-y-4">
      {/* Weekly totals, most recent first */}
      {weekly.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.015]">
          <p className="border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/35">
            Weekly load (last 4 weeks)
          </p>
          <div className="space-y-2.5 px-5 py-4">
            {weekly.map(w => (
              <div key={w.weekStart} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[10.5px] text-white/30">
                  {new Date(w.weekStart).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(w.load / maxWeekly) * 100}%`, background: accent }} />
                </div>
                <span className="w-14 shrink-0 text-right text-[11px] font-bold text-white/60">{w.load} AU</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session log */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.015]">
        <p className="border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/35">
          Sessions ({sessions.length})
        </p>
        <div className="divide-y divide-white/5">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: rpeColour(s.rpe) }} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-white">
                  {s.session_type} · {new Date(s.session_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                </p>
                {s.note && <p className="mt-0.5 line-clamp-1 text-[11px] text-white/40">{s.note}</p>}
              </div>
              <span className="shrink-0 text-[11px] font-bold" style={{ color: rpeColour(s.rpe) }}>
                RPE {s.rpe} · {s.duration_min}min
              </span>
              <span className="shrink-0 text-[10.5px] text-white/30">{s.load_au} AU</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[10.5px] leading-relaxed text-white/25">
        Load is RPE × session minutes, in arbitrary units. It is a record of what was done,
        not a readiness or injury-risk measure.
      </p>
    </div>
  );
}
