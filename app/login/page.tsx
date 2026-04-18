'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const COACH_PASSWORD = 'benniescoach';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTarget = useMemo(() => {
    const redirect = searchParams.get('redirect');
    if (!redirect || !redirect.startsWith('/')) return '/';
    return redirect;
  }, [searchParams]);

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function setCoachCookie() {
    const maxAgeSeconds = 60 * 60 * 8;
    document.cookie = `coach_access=granted; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (password !== COACH_PASSWORD) {
      setError('Incorrect coach password.');
      setSubmitting(false);
      return;
    }

    setCoachCookie();
    router.push(redirectTarget);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-400">
              St Benedict&apos;s College
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Coach Access Login
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This area is for internal staff and coaches only. Public users should use the
              Parent &amp; Player Portal for weekly plans, fixtures, results, and public leaderboards.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Protected System</p>
                <p className="mt-2 text-sm text-slate-300">
                  Dashboard, athletes, teams, attendance, performance, and portal admin are now behind coach access.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Public Access</p>
                <p className="mt-2 text-sm text-slate-300">
                  The <span className="font-semibold text-emerald-300">/portal</span> route remains open for parents and players.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Enter Coach Password</h2>
              <p className="mt-2 text-sm text-slate-400">
                After access is granted, you will be redirected back to your requested page.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Coach Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Checking Access...' : 'Unlock Coach System'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
              Temporary default password:
              <span className="ml-2 rounded-lg bg-slate-800 px-2 py-1 font-mono text-slate-200">
                benniescoach
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}