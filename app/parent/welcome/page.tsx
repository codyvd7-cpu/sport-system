'use client';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/components/BrandingProvider';

// ─── /parent/welcome ──────────────────────────────────────────────────────────
// Where a parent lands after tapping the invitation link.
//
// This is the moment parent onboarding usually dies, so it does as little as
// possible: no password to choose, no child to search for, no approval to wait
// on. Supabase has already verified the email by delivering the link, and the
// coach already chose the athlete — so by the time this page loads the work is
// done and it only needs to confirm it and get out of the way.
//
// A password is offered afterwards, as an option, for anyone who wants to sign
// in on another device. Skipping it is a first-class choice, not a nag.

function WelcomeInner() {
  const params = useSearchParams();
  const { branding } = useBranding();
  const athleteId = params.get('athlete');

  const [state, setState] = React.useState<'checking' | 'ready' | 'signedout' | 'error'>('checking');
  const [athleteName, setAthleteName] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState('');
  const [savingPw, setSavingPw] = React.useState(false);
  const [pwDone, setPwDone] = React.useState(false);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    let stop = false;
    (async () => {
      // Supabase turns the emailed link into a session automatically; give it
      // a moment to settle before deciding the parent isn't signed in.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await new Promise(r => setTimeout(r, 1200));
        const retry = await supabase.auth.getSession();
        if (!retry.data.session) { if (!stop) setState('signedout'); return; }
      }

      try {
        // The endpoint identifies the parent from this token — without it the
        // request is rejected as an expired link.
        const { data: { session: live } } = await supabase.auth.getSession();
        const res = await fetch('/api/parent/complete-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(live ? { Authorization: `Bearer ${live.access_token}` } : {}),
          },
          body: JSON.stringify({ athleteId }),
        });
        const d = await res.json();
        if (!stop) {
          if (res.ok && d.athleteName) { setAthleteName(d.athleteName); setState('ready'); }
          else { setErr(d.error || 'We could not finish setting up your account.'); setState('error'); }
        }
      } catch {
        if (!stop) { setErr('Something went wrong. Try the link again.'); setState('error'); }
      }
    })();
    return () => { stop = true; };
  }, [athleteId]);

  async function setPasswordNow(e: React.FormEvent) {
    e.preventDefault();
    setSavingPw(true); setErr('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setErr(error.message); else setPwDone(true);
    setSavingPw(false);
  }

  const accent = branding.primaryColor;

  if (state === 'checking') {
    return <p className="text-[13px] text-white/40">Setting up your account…</p>;
  }

  if (state === 'signedout') {
    return (
      <div className="text-center">
        <p className="text-[15px] font-bold text-white">That link has expired</p>
        <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-white/45">
          Invitation links only work once and don&apos;t last forever. Ask the school to send you a new one,
          or sign in if you&apos;ve already set a password.
        </p>
        <Link href="/player/auth" className="mt-4 inline-block text-[12.5px] font-bold" style={{ color: accent }}>
          Sign in →
        </Link>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="text-center">
        <p className="text-[15px] font-bold text-white">We couldn&apos;t finish setting that up</p>
        <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-white/45">{err}</p>
        <Link href="/portal" className="mt-4 inline-block text-[12.5px] font-bold" style={{ color: accent }}>
          Go to the portal →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
        {branding.name}
      </p>
      <h1 className="mt-2 text-[26px] font-black leading-tight text-white">
        You&apos;re all set
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-white/45">
        You&apos;re connected to <span className="font-bold text-white/80">{athleteName}</span>.
        You&apos;ll see their attendance, test results and coach feedback, plus fixtures for the whole school.
      </p>

      <Link href="/player/profile"
        className="mt-5 inline-block rounded-xl px-5 py-3 text-[13px] font-bold"
        style={{ background: accent + '22', border: `1px solid ${accent}66`, color: accent }}>
        See {athleteName?.split(' ')[0]}&apos;s profile →
      </Link>

      {/* Optional, deliberately secondary — a parent who ignores this is fine,
          they'll get a new link whenever they need one. */}
      <div className="mt-8 border-t border-white/8 pt-6">
        {pwDone ? (
          <p className="text-[12.5px] text-emerald-300">Password saved — you can now sign in on any device.</p>
        ) : (
          <>
            <p className="text-[12.5px] font-semibold text-white/70">Want to sign in on another device?</p>
            <p className="mt-1 text-[11.5px] text-white/30">
              Set a password. You don&apos;t have to — this device will stay signed in.
            </p>
            <form onSubmit={setPasswordNow} className="mt-3 flex gap-2">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                minLength={8} placeholder="At least 8 characters"
                className="flex-1 rounded-xl border border-white/10 bg-[#04060e] px-3 py-2.5 text-[12.5px] text-white outline-none placeholder:text-white/25 focus:border-white/25" />
              <button type="submit" disabled={savingPw || password.length < 8}
                className="rounded-xl border border-white/12 px-4 py-2.5 text-[12px] font-bold text-white/60 disabled:opacity-40">
                {savingPw ? 'Saving…' : 'Save'}
              </button>
            </form>
            {err && <p className="mt-2 text-[11.5px] text-red-300">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default function ParentWelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070d] px-6 py-12 text-white">
      <div className="w-full max-w-md">
        <React.Suspense fallback={<p className="text-[13px] text-white/40">Loading…</p>}>
          <WelcomeInner />
        </React.Suspense>
      </div>
    </div>
  );
}
