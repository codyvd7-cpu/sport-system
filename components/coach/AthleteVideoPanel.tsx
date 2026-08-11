'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── AthleteVideoPanel ─────────────────────────────────────────────────────────
// Every clip and tagged moment for one athlete, gathered from across all
// videos. This is what turns video review from a separate tool into part of
// athlete development: a coach opens a player and sees their actual footage
// beside their test results and goals.
//
// Each clip links straight into the review room at its start time, so "show me
// their penalty corners" is two taps rather than a hunt through match footage.

type Clip = {
  id: string; video_id: string; title: string;
  start_seconds: number; end_seconds: number;
  coach_note: string | null; visible_to_player: boolean; created_at: string;
};
type Tag = {
  id: string; video_id: string; label: string; color: string | null;
  timestamp_seconds: number; note: string | null; created_at: string;
};
type Video = {
  id: string; title: string; team: string | null; opponent: string | null;
  played_on: string | null; external_id: string;
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export default function AthleteVideoPanel({ athleteId, accent = '#38bdf8' }: { athleteId: string; accent?: string }) {
  const [clips, setClips] = React.useState<Clip[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const res = await fetch(`/api/video?athleteId=${athleteId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !stop) {
          const d = await res.json();
          setClips(d.clips || []); setTags(d.tags || []); setVideos(d.videos || []);
        }
      } catch { /* panel just doesn't render */ }
      if (!stop) setLoading(false);
    })();
    return () => { stop = true; };
  }, [athleteId]);

  if (loading) return null;

  const videoOf = (id: string) => videos.find(v => v.id === id);
  const describe = (v?: Video) => v
    ? [v.team, v.opponent && `vs ${v.opponent}`,
       v.played_on && new Date(v.played_on).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })]
       .filter(Boolean).join(' · ')
    : '';

  if (clips.length === 0 && tags.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-5">
        <p className="text-[12.5px] text-white/45">No clips for this athlete yet.</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/25">
          Tag their moments while reviewing a match, then save any tag as a clip.
        </p>
        <Link href="/video" className="mt-2.5 inline-block text-[11.5px] font-bold" style={{ color: accent }}>
          Video review →
        </Link>
      </div>
    );
  }

  // Group tags by their type so "6 circle entries" reads at a glance
  const byLabel = new Map<string, { count: number; color: string | null }>();
  for (const t of tags) {
    const e = byLabel.get(t.label) || { count: 0, color: t.color };
    e.count++; byLabel.set(t.label, e);
  }

  return (
    <div className="space-y-4">
      {/* What they've been tagged for */}
      {byLabel.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...byLabel.entries()].sort((a, b) => b[1].count - a[1].count).map(([label, e]) => (
            <span key={label} className="rounded-full px-3 py-1.5 text-[11px] font-bold"
              style={{ background: (e.color || accent) + '18', border: `1px solid ${(e.color || accent)}44`, color: e.color || accent }}>
              {label} <span className="opacity-60">{e.count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Clips */}
      {clips.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.015]">
          <p className="border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/35">
            Clips ({clips.length})
          </p>
          <div className="divide-y divide-white/5">
            {clips.map(c => {
              const v = videoOf(c.video_id);
              return (
                <Link key={c.id} href={`/video/${c.video_id}?t=${Math.floor(c.start_seconds)}`}
                  className="flex items-start gap-3 px-5 py-3 transition hover:bg-white/[0.03]">
                  {v && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`https://img.youtube.com/vi/${v.external_id}/default.jpg`} alt=""
                      className="h-11 w-16 shrink-0 rounded-md object-cover opacity-75" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-white">{c.title}</p>
                    <p className="truncate text-[10.5px] text-white/30">
                      {describe(v)}{v ? ' · ' : ''}{fmt(c.start_seconds)} · {Math.round(c.end_seconds - c.start_seconds)}s
                    </p>
                    {c.coach_note && <p className="mt-1 line-clamp-2 text-[11px] text-white/45">{c.coach_note}</p>}
                  </div>
                  {c.visible_to_player && (
                    <span className="shrink-0 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9.5px] font-bold text-emerald-300">
                      shared
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tagged moments not yet clipped */}
      {tags.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.015]">
          <p className="border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/35">
            Tagged moments ({tags.length})
          </p>
          <div className="max-h-64 divide-y divide-white/5 overflow-y-auto">
            {tags.map(t => {
              const v = videoOf(t.video_id);
              return (
                <Link key={t.id} href={`/video/${t.video_id}?t=${Math.floor(t.timestamp_seconds)}`}
                  className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-white/[0.03]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.color || accent }} />
                  <span className="shrink-0 font-mono text-[11px] text-white/35">{fmt(t.timestamp_seconds)}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-white/75">
                    {t.label}
                    {v && <span className="text-white/30"> · {describe(v)}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
