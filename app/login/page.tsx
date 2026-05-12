'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function cleanAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return 'Incorrect email or password. Please try again.';
  if (lower.includes('email not confirmed')) return 'This account has not been confirmed yet.';
  if (lower.includes('rate limit')) return 'Too many login attempts. Wait a moment and try again.';
  return message || 'Login failed. Please try again.';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/portal-admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) { router.replace(redirectTo); return; }
      setCheckingSession(false);
    }
    checkExistingSession();
  }, [router, redirectTo]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setStatus('Checking credentials...'); setErrorMessage('');
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Login timed out.')), 10000));
    try {
      const result = await Promise.race([supabase.auth.signInWithPassword({ email: email.trim(), password }), timeout]);
      if (result.error) { setErrorMessage(cleanAuthError(result.error.message)); setStatus(''); setLoading(false); return; }
      if (!result.data.session) { setErrorMessage('Login failed. Please confirm this user exists in Supabase.'); setStatus(''); setLoading(false); return; }
      setStatus('Login successful. Opening admin...');
      window.location.assign(redirectTo);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.');
      setStatus(''); setLoading(false);
    }
  }

  if (checkingSession) return (
    <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-center shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">St Benedict&apos;s Hockey</p>
        <h1 className="mt-3 text-2xl font-black">Checking session...</h1>
      </div>
    </main>
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.2),transparent_35%)]" />
      <div className="absolute left-[10%] top-[-10%] h-72 w-72 animate-pulse rounded-full bg-sky-500/20 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[10%] h-80 w-80 animate-pulse rounded-full bg-emerald-500/20 blur-3xl" />

      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white p-2 shadow-xl">
            <Image src="/st-benedicts-logo.png" alt="St Benedict's College" width={80} height={80} className="h-full w-full object-contain" priority />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">St Benedict&apos;s College</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Coach Login</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Secure staff access to manage the hockey portal.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">Email</label>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@stbenedicts.co.za"
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">Password</label>
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500" />
          </div>
          {status && <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">{status}</div>}
          {errorMessage && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div>}
          <button type="submit" disabled={loading}
            className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-sky-400 disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
          <a href="/portal" className="font-bold text-slate-400 transition hover:text-white">Back to Portal</a>
          <span>Coach Access Only</span>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}