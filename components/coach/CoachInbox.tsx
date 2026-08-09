'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── CoachInbox ────────────────────────────────────────────────────────────────
// "Understand today in 20 seconds."
//
// Three calm sections rather than a wall of cards: what's on today, who needs
// attention (each with its reason stated), and what's changed recently.
// Every attention item links straight to the athlete — the point is to reach
// the action in one tap, not to admire a dashboard.

type Fixture = { team: string; opponent: string; fixture_time: string; venue: string; home_away: string };
type Attention = { athleteId: string; name: string; reason: string; kind: string; detail?: string };
type Recent = { id: string; athleteId: string; name: string; type: string; summary: string; occurredAt: string; positive: boolean };
type Inbox = {
  today: { date: string; fixtures: Fixture[]; unavailableCount: number; squadSize: number; alert: { type: string; message: string } | null };
  attention: Attention[];
  attentionTotal: number;
  recent: Recent[];
  counts: { newPBs: number; attendanceConcerns: number; unavailable: number };
};

const KIND_TONE: Record<string, string> = {
  attendance: '#fbbf24',
  availability: '#f87171',
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

export default function CoachInbox({ team, accent = '#38bdf8' }: { team?: string; accent?: string }) {
  const [data, setData] = React.useState<Inbox | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const qs = team ? `?team=${encodeURIComponent(team)}` : '';
        const res = await fetch(`/api/coach/inbox${qs}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !stop) setData(await res.json());
      } catch { /* the dashboard still works without the inbox */ }
      if (!stop) setLoading(false);
    })();
    return () => { stop = true; };
  }, [team]);

  if (loading || !data) return null;

  const { today, attention, attentionTotal, recent } = data;
  const nothingToShow = !today.alert && today.fixtures.length === 0 && attention.length === 0 && recent.length === 0;
  if (nothingToShow) return null;

  const label = (t: string) => (
    <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.28)' }}>{t}</p>
  );

  return (
    <div className="space-y-4">
      {/* Active alert takes precedence over everything */}
      {today.alert && (
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.35)' }}>
          <div className="flex items-center gap-3">
            <span className="text-lg">⚡</span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: '#fca5a5' }}>Alert active</p>
              <p className="truncate text-[13px] font-bold text-white">{today.alert.message}</p>
            </div>
            <Link href="/lightning" className="shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold"
              style={{ borderColor: 'rgba(220,38,38,0.4)', color: '#fca5a5' }}>Manage</Link>
          </div>
        </div>
      )}

      {/* TODAY */}
      {today.fixtures.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}>
          {label('Today')}
          <div className="space-y-2">
            {today.fixtures.map((f, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[13px] text-white">
                  <span className="font-bold">{f.team}</span>
                  <span className="text-white/45"> vs {f.opponent}</span>
                </p>
                <p className="shrink-0 text-[11px] text-white/35">
                  {f.fixture_time || 'TBC'}{f.home_away ? ` · ${f.home_away === 'home' ? 'H' : 'A'}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEEDS ATTENTION — each item states its evidence */}
      {attention.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="mb-2.5 flex items-baseline justify-between">
            {label('Needs attention')}
            {attentionTotal > attention.length && (
              <span className="text-[10px] text-white/25">showing {attention.length} of {attentionTotal}</span>
            )}
          </div>
          <div className="space-y-1.5">
            {attention.map(a => (
              <Link key={`${a.kind}-${a.athleteId}`} href={`/athletes/${a.athleteId}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.03]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KIND_TONE[a.kind] || 'rgba(255,255,255,0.3)' }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white">{a.name}</p>
                  <p className="truncate text-[11px] text-white/40">{a.reason}{a.detail ? ` · ${a.detail}` : ''}</p>
                </div>
                <span className="shrink-0 text-[11px] text-white/25">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* RECENT — includes the good news */}
      {recent.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}>
          {label('Recent')}
          <div className="space-y-1.5">
            {recent.map(r => (
              <Link key={r.id} href={`/athletes/${r.athleteId}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/[0.03]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: r.positive ? '#34d399' : 'rgba(255,255,255,0.22)' }} />
                <p className="min-w-0 flex-1 truncate text-[12px]">
                  <span className="font-semibold text-white/85">{r.name}</span>
                  <span className="text-white/40"> — {r.summary}</span>
                </p>
                <span className="shrink-0 text-[10.5px] text-white/25">{timeAgo(r.occurredAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
