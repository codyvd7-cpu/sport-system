'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/components/BrandingProvider';

// ─── InviteParentsPanel ────────────────────────────────────────────────────────
// Sends parents an invitation email that links straight to their own child.
//
// The parent-side flow is only half the job: without a way for a coach to
// actually send these, invitations never go out and the whole thing is
// theoretical. This is that half.
//
// Shows plainly who can and can't be invited, because "no parent email on
// record" is the single reason an invite fails, and a coach can fix that
// themselves once they know which athletes are missing one.

type Athlete = { id: string; full_name: string; team?: string | null; parent_email?: string | null };
type Result = { athleteName: string; email: string | null; status: string };

export default function InviteParentsPanel({ team }: { team?: string }) {
  const { branding } = useBranding();
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [results, setResults] = React.useState<Result[] | null>(null);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    let stop = false;
    (async () => {
      let q = supabase.from('athletes')
        .select('id, full_name, team, parent_email')
        .eq('is_active', true).order('full_name');
      if (team) q = q.eq('team', team);
      const { data } = await q;
      if (!stop) {
        setAthletes(data || []);
        // Pre-select everyone who can actually be invited — the common case is
        // "send to the whole squad", and unticking a few is faster than ticking
        // ninety.
        setSelected(new Set((data || []).filter(a => a.parent_email).map(a => a.id)));
        setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [team]);

  const withEmail = athletes.filter(a => a.parent_email);
  const withoutEmail = athletes.filter(a => !a.parent_email);

  async function send() {
    setSending(true); setErr(''); setResults(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Signed out.');
      const res = await fetch('/api/parents/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ athleteIds: [...selected] }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not send invitations.');
      setResults(d.results || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send invitations.');
    }
    setSending(false);
  }

  if (loading) return null;

  const accent = branding.primaryColor;

  if (results) {
    const invited = results.filter(r => r.status === 'invited').length;
    const already = results.filter(r => r.status === 'already_linked').length;
    const failed = results.filter(r => r.status === 'failed');
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <p className="text-[14px] font-black text-white">
          {invited} invitation{invited === 1 ? '' : 's'} sent
        </p>
        <p className="mt-1 text-[12px] text-white/40">
          Parents get an email with a link straight to their child. No password or code needed.
          {already > 0 && ` ${already} were already connected.`}
        </p>
        {failed.length > 0 && (
          <div className="mt-3 rounded-xl bg-red-500/[0.07] p-3">
            <p className="text-[11.5px] font-bold text-red-200/80">{failed.length} could not be sent</p>
            {failed.slice(0, 5).map((f, i) => (
              <p key={i} className="mt-0.5 text-[11px] text-white/40">{f.athleteName} — {f.email}</p>
            ))}
          </div>
        )}
        <button onClick={() => setResults(null)} className="mt-3 text-[12px] font-bold" style={{ color: accent }}>
          Send more
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <p className="text-[14px] font-black text-white">Invite parents</p>
      <p className="mt-1 text-[12px] leading-relaxed text-white/40">
        Each parent gets an email linking straight to their own child&apos;s attendance, results and feedback.
        No code to type and no password to set up.
      </p>

      {withEmail.length > 0 && (
        <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-white/6">
          {withEmail.map(a => {
            const on = selected.has(a.id);
            return (
              <button key={a.id}
                onClick={() => setSelected(s => {
                  const n = new Set(s);
                  if (n.has(a.id)) n.delete(a.id); else n.add(a.id);
                  return n;
                })}
                className="flex w-full items-center gap-3 border-b border-white/5 px-3.5 py-2.5 text-left transition hover:bg-white/[0.03]">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold"
                  style={{
                    background: on ? accent + '25' : 'transparent',
                    border: `1px solid ${on ? accent + '77' : 'rgba(255,255,255,0.15)'}`,
                    color: accent,
                  }}>
                  {on ? '✓' : ''}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/85">{a.full_name}</span>
                <span className="shrink-0 truncate text-[10.5px] text-white/25">{a.parent_email}</span>
              </button>
            );
          })}
        </div>
      )}

      {withoutEmail.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-500/[0.06] p-3">
          <p className="text-[11.5px] font-bold text-amber-200/80">
            {withoutEmail.length} athlete{withoutEmail.length === 1 ? ' has' : 's have'} no parent email
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">
            Add one on their profile and they&apos;ll appear here. {withoutEmail.slice(0, 3).map(a => a.full_name).join(', ')}
            {withoutEmail.length > 3 && ` and ${withoutEmail.length - 3} more`}.
          </p>
        </div>
      )}

      <button onClick={send} disabled={sending || selected.size === 0}
        className="mt-4 w-full rounded-xl py-3 text-[13px] font-bold disabled:opacity-40"
        style={{ background: accent + '22', border: `1px solid ${accent}66`, color: accent }}>
        {sending ? 'Sending…' : `Invite ${selected.size} parent${selected.size === 1 ? '' : 's'}`}
      </button>

      {err && <p className="mt-2 text-[11.5px] text-red-300">{err}</p>}
    </div>
  );
}
