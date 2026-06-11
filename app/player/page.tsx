'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PlayerPortalPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setError('Please enter your access code.'); return; }
    setChecking(true);
    setError('');

    // Route through API to apply server-side rate limiting
    try {
      const res = await fetch('/api/player/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.found) {
        setError(data.error || 'Invalid code. Please check and try again.');
        setChecking(false);
        return;
      }
      router.push(`/player/${code.trim().toUpperCase()}`);
    } catch {
      setError('Network error. Please try again.');
      setChecking(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#06071a] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(14,165,233,0.08),transparent)]" />
      <div className="absolute left-[5%] top-[10%] h-64 w-64 rounded-full bg-sky-500/8 blur-3xl" />
      <div className="absolute bottom-[10%] right-[5%] h-64 w-64 rounded-full bg-violet-500/8 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-xl ring-1 ring-white/10">
            <Image src="/st-benedicts-logo.png" alt="SBC" width={80} height={80} className="h-full w-full object-contain" priority/>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-400">St Benedict&apos;s College</p>
          <h1 className="mt-2 text-3xl font-black text-white">Player & Parent</h1>
          <p className="mt-2 text-sm text-slate-400">Enter your personal access code</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Access Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SBCA3F7K"
                maxLength={12}
                autoFocus
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-center text-2xl font-black uppercase tracking-[0.3em] text-white outline-none transition placeholder:text-slate-700 placeholder:text-base placeholder:tracking-normal focus:border-sky-500"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">{error}</div>
            )}

            <button type="submit" disabled={checking || !code.trim()}
              className="w-full rounded-2xl border border-sky-500/50 bg-sky-500/15 py-4 text-sm font-black text-sky-300 transition hover:bg-sky-500/25 active:scale-[0.98] disabled:opacity-40">
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                  Checking...
                </span>
              ) : 'Access My Profile →'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-600">Don&apos;t have a code? Ask your coach.</p>
        </div>

        {/* Portal link */}
        <div className="mt-6 text-center">
          <a href="/portal" className="text-xs text-slate-600 hover:text-slate-400 transition">View Team Portal →</a>
        </div>
      </div>
    </main>
  );
}