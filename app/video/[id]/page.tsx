'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── /video/[id] ──────────────────────────────────────────────────────────────
// The review room.
//
// The design goal is speed: a coach watching at 1× should be able to tag a
// moment with one keypress and never touch the mouse. Everything else is
// secondary to that, because a tagging tool that interrupts the watch is a
// tagging tool nobody uses twice.
//
// Tags capture a lead-in automatically (a goal needs the build-up, not just
// the shot), so pressing G a second late still catches the right moment.

type TagType = { id: string; label: string; hotkey: string | null; color: string; lead_seconds: number; trail_seconds: number };
type Tag = { id: string; label: string; color: string | null; timestamp_seconds: number; athlete_id: string | null; note: string | null };
type Clip = { id: string; title: string; start_seconds: number; end_seconds: number; athlete_id: string | null; coach_note: string | null; visible_to_player: boolean };
type Athlete = { id: string; full_name: string };
type Video = { id: string; title: string; team: string | null; opponent: string | null; played_on: string | null; external_id: string; provider: string };

const fmt = (s: number) => {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void } }

export default function VideoReviewPage() {
  const params = useParams();
  const videoId = String(params?.id || '');

  const [video, setVideo] = React.useState<Video | null>(null);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [clips, setClips] = React.useState<Clip[]>([]);
  const [tagTypes, setTagTypes] = React.useState<TagType[]>([]);
  const [squad, setSquad] = React.useState<Athlete[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');
  const [flash, setFlash] = React.useState('');

  // Who a tag is attributed to. Held in a ref as well so the keydown handler
  // reads the current value without being re-bound on every change.
  const [activeAthlete, setActiveAthlete] = React.useState<string>('');
  const activeAthleteRef = React.useRef('');
  React.useEffect(() => { activeAthleteRef.current = activeAthlete; }, [activeAthlete]);

  const playerRef = React.useRef<any>(null);
  const [ready, setReady] = React.useState(false);
  const tagTypesRef = React.useRef<TagType[]>([]);
  React.useEffect(() => { tagTypesRef.current = tagTypes; }, [tagTypes]);

  const authed = React.useCallback(async (init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Signed out.');
    return fetch('/api/video', {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) },
    });
  }, []);

  const load = React.useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setErr('Sign in as staff.'); setLoading(false); return; }
      const res = await fetch(`/api/video?videoId=${videoId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not load.');
      const d = await res.json();
      setVideo(d.video); setTags(d.tags); setClips(d.clips);
      setTagTypes(d.tagTypes); setSquad(d.squad);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load.'); }
    setLoading(false);
  }, [videoId]);

  React.useEffect(() => { load(); }, [load]);

  // ── YouTube player ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!video?.external_id) return;
    function build() {
      if (!window.YT?.Player) return;
      playerRef.current = new window.YT.Player('yt-player', {
        videoId: video!.external_id,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onReady: () => setReady(true) },
      });
    }
    if (window.YT?.Player) { build(); return; }
    const existing = document.getElementById('yt-api');
    if (!existing) {
      const s = document.createElement('script');
      s.id = 'yt-api'; s.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(s);
    }
    window.onYouTubeIframeAPIReady = build;
  }, [video?.external_id]);

  const seekTo = React.useCallback((s: number) => {
    playerRef.current?.seekTo?.(Math.max(0, s), true);
    playerRef.current?.playVideo?.();
  }, []);

  const addTag = React.useCallback(async (tt: TagType) => {
    const t = playerRef.current?.getCurrentTime?.();
    if (typeof t !== 'number') return;
    // Subtract the lead so the build-up is included — pressing a second late
    // still captures the right moment.
    const stamp = Math.max(0, t - (tt.lead_seconds || 0) * 0.4);
    setFlash(tt.label);
    setTimeout(() => setFlash(''), 700);
    try {
      const res = await authed({
        method: 'POST',
        body: JSON.stringify({
          kind: 'tag', videoId, tagTypeId: tt.id, label: tt.label, color: tt.color,
          timestampSeconds: stamp, athleteId: activeAthleteRef.current || null,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setTags(prev => [...prev, d.tag].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
      }
    } catch { /* tagging should never interrupt the watch */ }
  }, [authed, videoId]);

  // ── Hotkeys ───────────────────────────────────────────────────────────────
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === ' ') {
        e.preventDefault();
        const st = playerRef.current?.getPlayerState?.();
        st === 1 ? playerRef.current?.pauseVideo?.() : playerRef.current?.playVideo?.();
        return;
      }
      if (k === 'arrowleft')  { e.preventDefault(); seekTo((playerRef.current?.getCurrentTime?.() || 0) - 5); return; }
      if (k === 'arrowright') { e.preventDefault(); seekTo((playerRef.current?.getCurrentTime?.() || 0) + 5); return; }

      const tt = tagTypesRef.current.find(t => t.hotkey?.toLowerCase() === k);
      if (tt) { e.preventDefault(); addTag(tt); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addTag, seekTo]);

  async function makeClip(tag: Tag) {
    const tt = tagTypes.find(t => t.label === tag.label);
    const lead = tt?.lead_seconds ?? 8, trail = tt?.trail_seconds ?? 4;
    try {
      const res = await authed({
        method: 'POST',
        body: JSON.stringify({
          kind: 'clip', videoId,
          title: tag.label, startSeconds: Math.max(0, tag.timestamp_seconds - lead),
          endSeconds: tag.timestamp_seconds + trail, athleteId: tag.athlete_id,
        }),
      });
      if (res.ok) { const d = await res.json(); setClips(prev => [...prev, d.clip].sort((a, b) => a.start_seconds - b.start_seconds)); }
    } catch { /* ignore */ }
  }

  async function removeTag(id: string) {
    try {
      await authed({ method: 'DELETE', body: JSON.stringify({ kind: 'tag', id }) });
      setTags(prev => prev.filter(t => t.id !== id));
    } catch { /* ignore */ }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#05070d] text-[13px] text-white/40">Loading…</div>;
  if (err || !video) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#05070d] text-white">
        <p className="text-[13px] text-white/50">{err || 'Video not found.'}</p>
        <Link href="/video" className="text-[12px] text-sky-400">← Video library</Link>
      </div>
    );
  }

  const nameOf = (id: string | null) => (id ? squad.find(a => a.id === id)?.full_name ?? null : null);

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/video" className="text-[12px] text-white/35 hover:text-white/60">← Video library</Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-black tracking-tight">{video.title}</h1>
          <p className="text-[11.5px] text-white/30">
            {[video.team, video.opponent && `vs ${video.opponent}`,
              video.played_on && new Date(video.played_on).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })]
              .filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          {/* Player + tag bar */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-black">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <div id="yt-player" className="absolute inset-0 h-full w-full" />
              </div>
            </div>

            {flash && (
              <p className="mt-2 text-center text-[12px] font-bold text-emerald-300">✓ {flash} tagged</p>
            )}

            {/* Attribution — set once, then tag freely */}
            <div className="mt-3 flex items-center gap-2">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-white/30">Tagging for</span>
              <select value={activeAthlete} onChange={e => setActiveAthlete(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-[#04060e] px-3 py-2 text-[12px] text-white outline-none focus:border-white/25">
                <option value="">Whole team</option>
                {squad.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>

            {/* Hotkey buttons — tappable on a phone, keyboard on a laptop */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tagTypes.map(tt => (
                <button key={tt.id} onClick={() => addTag(tt)} disabled={!ready}
                  className="rounded-xl px-3 py-3 text-[12px] font-bold transition disabled:opacity-30"
                  style={{ background: tt.color + '18', border: `1px solid ${tt.color}55`, color: tt.color }}>
                  {tt.label}
                  {tt.hotkey && <span className="ml-1.5 opacity-50">{tt.hotkey.toUpperCase()}</span>}
                </button>
              ))}
            </div>

            <p className="mt-2.5 text-center text-[10.5px] text-white/25">
              Press a hotkey to tag · Space play/pause · ← → skip 5s
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015]">
              <p className="border-b border-white/5 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-white/35">
                Tags ({tags.length})
              </p>
              {tags.length === 0 ? (
                <p className="px-4 py-6 text-center text-[11.5px] text-white/25">
                  Play the video and press a hotkey to tag a moment.
                </p>
              ) : (
                <div className="max-h-[420px] divide-y divide-white/5 overflow-y-auto">
                  {tags.map(t => (
                    <div key={t.id} className="group flex items-center gap-2.5 px-4 py-2.5">
                      <button onClick={() => seekTo(t.timestamp_seconds)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.color || '#38bdf8' }} />
                        <span className="shrink-0 font-mono text-[11px] text-white/40">{fmt(t.timestamp_seconds)}</span>
                        <span className="min-w-0 flex-1 truncate text-[12px] text-white/80">
                          {t.label}
                          {nameOf(t.athlete_id) && <span className="text-white/35"> · {nameOf(t.athlete_id)}</span>}
                        </span>
                      </button>
                      <button onClick={() => makeClip(t)} title="Save as clip"
                        className="shrink-0 text-[10px] font-bold text-sky-400 opacity-0 transition group-hover:opacity-100">clip</button>
                      <button onClick={() => removeTag(t.id)} title="Delete"
                        className="shrink-0 text-[11px] text-white/20 opacity-0 transition hover:text-red-300 group-hover:opacity-100">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {clips.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015]">
                <p className="border-b border-white/5 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-white/35">
                  Clips ({clips.length})
                </p>
                <div className="max-h-[240px] divide-y divide-white/5 overflow-y-auto">
                  {clips.map(c => (
                    <button key={c.id} onClick={() => seekTo(c.start_seconds)}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition hover:bg-white/[0.03]">
                      <span className="shrink-0 font-mono text-[11px] text-white/40">{fmt(c.start_seconds)}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-white/75">
                        {c.title}
                        {nameOf(c.athlete_id) && <span className="text-white/35"> · {nameOf(c.athlete_id)}</span>}
                      </span>
                      <span className="shrink-0 text-[10px] text-white/25">
                        {Math.round(c.end_seconds - c.start_seconds)}s
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
