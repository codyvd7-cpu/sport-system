'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Supabase puts the session in the URL hash after invite click
    // It auto-sets the session, we just need to wait for it
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) setReady(true);
      }
    });

    // Check if already have a session (invite auto-signed in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }

    router.replace('/dashboard');
  }

  if (!ready) return (
    <main className="flex min-h-screen items-center justify-center bg-[rgba(255,255,255,0.01)]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/8 border-t-sky-500"/>
        <p className="text-sm text-white/35">Setting up your account…</p>
      </div>
    </main>
  );

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#060812] px-4 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(56,189,248,0.08),transparent)]"/>

      <section className="relative z-10 w-full max-w-sm rounded-[2rem] border border-white/8 bg-[rgba(255,255,255,0.01)]/95 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-xl">
            <Image src="/st-benedicts-logo.png" alt="SBC" width={80} height={80} className="h-full w-full object-contain" priority/>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">St Benedict&apos;s College</p>
          <h1 className="mt-2 text-2xl font-black text-white">Set Your Password</h1>
          <p className="mt-1.5 text-sm text-white/50">Choose a password for your coach account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/50">New Password</label>
            <input type="password" required minLength={8}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.025)] px-4 py-3 text-sm text-white outline-none focus:border-sky-500 transition"/>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/50">Confirm Password</label>
            <input type="password" required minLength={8}
              value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className="w-full rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.025)] px-4 py-3 text-sm text-white outline-none focus:border-sky-500 transition"/>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</div>
          )}

          <button type="submit" disabled={loading || !password || !confirm}
            className="w-full rounded-2xl border border-sky-500/40 bg-sky-500/15 py-3 text-sm font-black text-sky-300 hover:bg-sky-500/25 transition disabled:opacity-50">
            {loading ? 'Setting password…' : 'Set Password & Continue →'}
          </button>
        </form>
      </section>
    </main>
  );
}
