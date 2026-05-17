'use client';

import * as React from 'react';
import Image from 'next/image';

export default function HPLoginPage() {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);



  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const HP_CODE = process.env.NEXT_PUBLIC_HP_ACCESS_CODE;
    if (!HP_CODE) { setError('Access system not configured. Contact admin.'); setLoading(false); return; }

    if (code.trim().toLowerCase() === HP_CODE.toLowerCase()) {
      sessionStorage.setItem('hp_access', 'true');
      window.location.href = '/hp';
    } else {
      setError('Incorrect access code. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#03100a] px-4 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(16,185,129,0.12),transparent)]" />
      <div className="absolute left-[-5%] top-[-5%] h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] h-96 w-96 rounded-full bg-emerald-400/8 blur-3xl" />

      <section className="relative z-10 w-full max-w-sm rounded-[2rem] border border-emerald-900/50 bg-slate-950/95 p-6 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl ring-1 ring-white/5 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2 shadow-2xl shadow-emerald-500/20 ring-1 ring-emerald-500/20">
            <Image src="/st-benedicts-logo.png" alt="St Benedict's College" width={96} height={96} className="h-full w-full object-contain" priority />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-400">St Benedict's College</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white">HP Access</h1>
          <p className="mt-2 text-sm text-slate-400">High Performance Department</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Access Code</label>
            <input
              type="password" required
              value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="Enter access code"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500 transition text-center tracking-widest text-lg"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 text-center">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !code.trim()}
            className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/15 py-3.5 text-sm font-black text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50">
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-slate-600 hover:text-slate-400 transition">← Back to Departments</a>
        </div>
      </section>
    </main>
  );
}
