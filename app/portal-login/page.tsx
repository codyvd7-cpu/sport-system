'use client';
import * as React from 'react';
import Image from 'next/image';

export default function PortalLoginPage() {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Access denied.'); setLoading(false); return; }
      window.location.href = '/portal';
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#06071a] px-4 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(14,165,233,0.08),transparent)]"/>
      <div className="absolute left-[5%] top-[10%] h-64 w-64 rounded-full bg-sky-500/8 blur-3xl"/>
      <div className="absolute bottom-[10%] right-[5%] h-64 w-64 rounded-full bg-violet-500/8 blur-3xl"/>

      <section className="relative z-10 w-full max-w-sm rounded-[2rem] border border-slate-800 bg-slate-950/95 p-8 shadow-2xl ring-1 ring-white/5">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-xl ring-1 ring-white/10">
            <Image src="/st-benedicts-logo.png" alt="SBC" width={80} height={80} className="h-full w-full object-contain" priority/>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-400">St Benedict's College</p>
          <h1 className="mt-2 text-3xl font-black text-white">Hockey Portal</h1>
          <p className="mt-2 text-sm text-slate-400">Enter the portal access code to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password" required
            value={code} onChange={e => setCode(e.target.value)}
            placeholder="Access code"
            autoComplete="off"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-lg tracking-widest text-white outline-none placeholder:text-slate-600 focus:border-sky-500 transition"
          />
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 text-center">{error}</div>
          )}
          <button type="submit" disabled={loading || !code.trim()}
            className="w-full rounded-2xl border border-sky-500/40 bg-sky-500/15 py-3 text-sm font-black text-sky-300 hover:bg-sky-500/25 transition disabled:opacity-50">
            {loading ? 'Checking...' : 'Enter Portal'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-slate-600 hover:text-slate-400 transition">← Back to Departments</a>
        </div>
      </section>
    </main>
  );
}
