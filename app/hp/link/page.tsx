'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── /hp/link ─────────────────────────────────────────────────────────────────
// Connects HP student records to athlete records, so one young person has one
// development record instead of two disconnected halves.
//
// Every link is confirmed by a human. Suggestions are ranked by name
// similarity, but nothing is applied automatically — an incorrect automatic
// match would attach one child's test results to another child's profile.
// A suggestion being obvious is not the same as it being verified.

type Suggestion = { athleteId: string; name: string; team: string | null; score: number };
type Unlinked = { hpStudentId: string; name: string; grade: string | null; classGroup: string | null; suggestions: Suggestion[]; confident: boolean };
type Linked = { hpStudentId: string; name: string; athleteId: string; athleteName: string; team: string | null };

export default function LinkPage() {
  const [unlinked, setUnlinked] = React.useState<Unlinked[]>([]);
  const [linked, setLinked] = React.useState<Linked[]>([]);
  const [counts, setCounts] = React.useState({ hpStudents: 0, athletes: 0, linked: 0 });
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState('');
  const [showLinked, setShowLinked] = React.useState(false);

  const call = React.useCallback(async (init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Signed out.');
    return fetch('/api/hp/link', {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) },
    });
  }, []);

  const load = React.useCallback(async () => {
    try {
      const res = await call();
      if (res.ok) {
        const d = await res.json();
        setUnlinked(d.unlinked || []); setLinked(d.linked || []); setCounts(d.counts || {});
      } else setErr('Could not load. Are you signed in as staff?');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load.'); }
    setLoading(false);
  }, [call]);

  React.useEffect(() => { load(); }, [load]);

  async function linkTo(hpStudentId: string, athleteId: string, method: string) {
    setBusy(hpStudentId); setErr('');
    try {
      const res = await call({ method: 'POST', body: JSON.stringify({ hpStudentId, athleteId, method }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not link.');
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not link.'); }
    setBusy(null);
  }

  async function unlink(hpStudentId: string) {
    setBusy(hpStudentId); setErr('');
    try {
      const res = await call({ method: 'DELETE', body: JSON.stringify({ hpStudentId }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not unlink.');
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not unlink.'); }
    setBusy(null);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#05070d] text-[13px] text-white/40">Loading…</div>;
  }

  const pct = counts.hpStudents ? Math.round((counts.linked / counts.hpStudents) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#05070d] px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/hp" className="text-[12px] text-white/35 hover:text-white/60">← HP</Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Link students to athletes</h1>
        <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/40">
          HP testing records and team athlete records are separate. Linking them means a coach sees one
          complete picture per person — test results on the athlete profile, and team context in HP.
        </p>

        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-3.5">
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#38bdf8' }} />
            </div>
          </div>
          <p className="shrink-0 text-[12px] text-white/50">
            <b className="text-white">{counts.linked}</b> of {counts.hpStudents} linked
          </p>
        </div>

        {err && <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{err}</p>}

        {unlinked.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-8 text-center">
            <p className="text-[14px] font-bold text-emerald-300">All students linked.</p>
            <p className="mt-1 text-[12px] text-white/35">Every HP student is connected to an athlete record.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {unlinked.map(u => (
              <div key={u.hpStudentId} className="rounded-2xl border border-white/6 bg-white/[0.015] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13.5px] font-bold text-white">{u.name}</p>
                  <p className="shrink-0 text-[11px] text-white/30">{[u.grade, u.classGroup].filter(Boolean).join(' ')}</p>
                </div>

                {u.suggestions.length === 0 ? (
                  <p className="mt-2 text-[11.5px] text-white/30">
                    No similar athlete found. They may not be on a team, or the names differ too much.
                  </p>
                ) : (
                  <div className="mt-3 space-y-1.5">
                    {u.suggestions.map(sg => (
                      <div key={sg.athleteId} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] text-white/85">{sg.name}</p>
                          <p className="text-[10.5px] text-white/30">
                            {sg.team || 'No team'} · {Math.round(sg.score * 100)}% name match
                          </p>
                        </div>
                        <button onClick={() => linkTo(u.hpStudentId, sg.athleteId, sg.score >= 0.95 ? 'suggested_confirmed' : 'manual')}
                          disabled={busy === u.hpStudentId}
                          className="shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold disabled:opacity-40"
                          style={{ borderColor: 'rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.1)', color: '#7dd3fc' }}>
                          {busy === u.hpStudentId ? '…' : 'This is them'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {linked.length > 0 && (
          <div className="mt-8">
            <button onClick={() => setShowLinked(v => !v)} className="text-[12px] font-bold text-white/45 hover:text-white/70">
              {showLinked ? 'Hide' : 'Show'} {linked.length} linked
            </button>
            {showLinked && (
              <div className="mt-3 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015]">
                {linked.map(l => (
                  <div key={l.hpStudentId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <p className="min-w-0 truncate text-[12.5px] text-white/70">
                      {l.name} <span className="text-white/25">↔</span> {l.athleteName}
                      {l.team && <span className="text-white/25"> · {l.team}</span>}
                    </p>
                    <button onClick={() => unlink(l.hpStudentId)} disabled={busy === l.hpStudentId}
                      className="shrink-0 text-[11px] text-white/30 hover:text-red-300 disabled:opacity-40">
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
