'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── /video ───────────────────────────────────────────────────────────────────
// The video library. Links only for now — schools host the footage, Altus
// stores the tags. See supabase-video-review.sql for why.

type Video = {
  id: string; title: string; team: string | null; opponent: string | null;
  played_on: string | null; external_id: string; tagCount: number;
};

export default function VideoLibraryPage() {
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', url: '', team: '', opponent: '', playedOn: '' });

  const call = React.useCallback(async (init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Signed out.');
    return fetch('/api/video' + (init ? '' : '?list=1'), {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) },
    });
  }, []);

  const load = React.useCallback(async () => {
    try {
      const res = await call();
      if (res.ok) setVideos((await res.json()).videos || []);
      else setErr('Could not load. Are you signed in as staff?');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load.'); }
    setLoading(false);
  }, [call]);

  React.useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const res = await call({ method: 'POST', body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not add video.');
      setForm({ title: '', url: '', team: '', opponent: '', playedOn: '' });
      setShowAdd(false); await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add video.'); }
    setBusy(false);
  }

  const input = 'rounded-xl border border-white/10 bg-[#04060e] px-3 py-2.5 text-[12.5px] text-white outline-none placeholder:text-white/25 focus:border-white/25';

  return (
    <div className="min-h-screen bg-[#05070d] px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-[12px] text-white/35 hover:text-white/60">← Dashboard</Link>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight">Video review</h1>
          {!showAdd && (
            <button onClick={() => setShowAdd(true)} className="text-[12.5px] font-bold text-sky-400">+ Add video</button>
          )}
        </div>
        <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/40">
          Tag moments as you watch, turn them into clips, and attach them to players.
        </p>

        {err && <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{err}</p>}

        {showAdd && (
          <form onSubmit={add} className="mt-5 space-y-2.5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <input className={`w-full ${input}`} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Title — e.g. 1st XI vs Northcliff" required />
            <input className={`w-full ${input}`} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
              placeholder="YouTube link" required />
            <div className="grid grid-cols-3 gap-2">
              <input className={input} value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} placeholder="Team" />
              <input className={input} value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })} placeholder="Opponent" />
              <input className={input} type="date" value={form.playedOn} onChange={e => setForm({ ...form, playedOn: e.target.value })} />
            </div>
            <p className="text-[10.5px] leading-relaxed text-white/25">
              Upload the match to YouTube as <b className="text-white/40">Unlisted</b> — it won&apos;t appear in search or on your channel,
              and only people with the link can view it.
            </p>
            <div className="flex gap-2 pt-0.5">
              <button type="submit" disabled={busy}
                className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-[12px] font-bold text-sky-300 disabled:opacity-40">
                {busy ? 'Adding…' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-[12px] text-white/45">Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="mt-8 text-center text-[12px] text-white/30">Loading…</p>
        ) : videos.length === 0 ? (
          !showAdd && (
            <div className="mt-6 rounded-2xl border border-white/6 bg-white/[0.015] p-10 text-center">
              <p className="text-[13px] text-white/40">No videos yet.</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-white/25">
                Add a match to start tagging goals, penalty corners and coaching points as you watch.
              </p>
            </div>
          )
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {videos.map(v => (
              <Link key={v.id} href={`/video/${v.id}`}
                className="group overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015] transition hover:border-white/15">
                <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://img.youtube.com/vi/${v.external_id}/mqdefault.jpg`} alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />
                  {v.tagCount > 0 && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white/85">
                      {v.tagCount} tag{v.tagCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="truncate text-[13px] font-bold text-white">{v.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-white/30">
                    {[v.team, v.opponent && `vs ${v.opponent}`,
                      v.played_on && new Date(v.played_on).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })]
                      .filter(Boolean).join(' · ') || 'No details'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
