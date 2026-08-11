'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── /claims ──────────────────────────────────────────────────────────────────
// Coaches approve requests from players and parents to access an athlete's
// information.
//
// The screen deliberately shows what the school already holds — the parent
// name and email on the athlete record — right next to who's asking. That's
// the evidence a coach needs to decide, and it means approving is a judgement
// rather than a rubber stamp.

type Claim = {
  id: string; athleteId: string; athleteName: string; team: string | null;
  onFileParent: string | null; onFileEmail: string | null;
  requestedBy: string; claimType: string; status: string;
  approvedVia: string | null; approvedBy: string | null;
  requestedAt: string; emailMatchesFile: boolean;
};
type Data = {
  pending: Claim[];
  approved: Claim[];
  multipleClaims: { athleteId: string; athleteName: string; count: number; claims: Claim[] }[];
};

export default function ClaimsPage() {
  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState('');
  const [showApproved, setShowApproved] = React.useState(false);

  const call = React.useCallback(async (init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Signed out.');
    return fetch('/api/coach/claims', {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) },
    });
  }, []);

  const load = React.useCallback(async () => {
    try {
      const res = await call();
      if (res.ok) setData(await res.json());
      else setErr('Could not load. Are you signed in as staff?');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load.'); }
    setLoading(false);
  }, [call]);

  React.useEffect(() => { load(); }, [load]);

  async function decide(claimId: string, action: 'approve' | 'reject') {
    setBusy(claimId); setErr('');
    try {
      const res = await call({ method: 'PATCH', body: JSON.stringify({ claimId, action }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Action failed.');
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Action failed.'); }
    setBusy(null);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#05070d] text-[13px] text-white/40">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-[12px] text-white/35 hover:text-white/60">← Dashboard</Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Access requests</h1>
        <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/40">
          Players and parents asking to link to an athlete. Approve only if you know the request is genuine —
          approving gives them access to that athlete&apos;s attendance, results and profile.
        </p>

        {err && <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{err}</p>}

        {/* Pending */}
        {data && data.pending.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/6 bg-white/[0.015] p-8 text-center">
            <p className="text-[13px] text-white/40">No requests waiting.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {data?.pending.map(c => (
              <div key={c.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13.5px] font-bold text-white">{c.athleteName}</p>
                  <p className="shrink-0 text-[11px] text-white/30">{c.team}</p>
                </div>

                <div className="mt-3 space-y-1.5 rounded-xl bg-black/25 px-3 py-2.5 text-[11.5px]">
                  <p className="text-white/50">
                    Requested by <b className="text-white/85">{c.requestedBy}</b>
                    <span className="text-white/30"> · as {c.claimType}</span>
                  </p>
                  <p className="text-white/40">
                    On file: {c.onFileParent || '—'}
                    {c.onFileEmail ? <span className="text-white/30"> · {c.onFileEmail}</span> : null}
                  </p>
                  {c.emailMatchesFile && (
                    <p className="text-emerald-300">✓ Email matches the parent email on record</p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => decide(c.id, 'approve')} disabled={busy === c.id}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[12px] font-bold text-emerald-300 disabled:opacity-40">
                    {busy === c.id ? '…' : 'Approve'}
                  </button>
                  <button onClick={() => decide(c.id, 'reject')} disabled={busy === c.id}
                    className="rounded-xl border border-white/10 px-4 py-2 text-[12px] font-semibold text-white/45 disabled:opacity-40">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* More than one approved claim on the same athlete */}
        {data && data.multipleClaims.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/35">Shared access</p>
            <div className="space-y-2">
              {data.multipleClaims.map(m => (
                <div key={m.athleteId} className="rounded-2xl border border-white/6 bg-white/[0.015] p-4">
                  <p className="text-[12.5px] font-semibold text-white">
                    {m.athleteName} <span className="text-white/30">· {m.count} accounts</span>
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    {m.claims.map(c => (
                      <p key={c.id} className="text-[11px] text-white/40">
                        {c.requestedBy} <span className="text-white/25">
                          ({c.claimType}{c.approvedVia === 'parent_email_match' ? ', email verified' : c.approvedBy ? `, by ${c.approvedBy}` : ''})
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] text-white/25">
              A player and a parent both having access is normal. More than that is worth checking.
            </p>
          </div>
        )}

        {/* Approved history */}
        {data && data.approved.length > 0 && (
          <div className="mt-8">
            <button onClick={() => setShowApproved(v => !v)} className="text-[12px] font-bold text-white/45 hover:text-white/70">
              {showApproved ? 'Hide' : 'Show'} {data.approved.length} approved
            </button>
            {showApproved && (
              <div className="mt-3 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015]">
                {data.approved.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <p className="min-w-0 truncate text-[12px] text-white/65">
                      {c.athleteName} <span className="text-white/25">←</span> {c.requestedBy}
                    </p>
                    <span className="shrink-0 text-[10.5px] text-white/25">
                      {c.approvedVia === 'parent_email_match' ? 'auto' : 'coach'}
                    </span>
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
