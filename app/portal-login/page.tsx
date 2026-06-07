'use client';
import * as React from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const SPORT_CONFIG: Record<string, { label: string; color: string; colorClass: string; borderClass: string; bgClass: string }> = {
  hockey:    { label: 'Hockey',     color: '#38bdf8', colorClass: 'text-sky-400',    borderClass: 'border-sky-500/40',    bgClass: 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300' },
  rugby:     { label: 'Rugby',      color: '#f87171', colorClass: 'text-red-400',    borderClass: 'border-red-500/40',    bgClass: 'bg-red-500/15 hover:bg-red-500/25 text-red-300' },
  cricket:   { label: 'Cricket',    color: '#fbbf24', colorClass: 'text-amber-400',  borderClass: 'border-amber-500/40',  bgClass: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300' },
  rowing:    { label: 'Rowing',     color: '#34d399', colorClass: 'text-emerald-400',borderClass: 'border-emerald-500/40',bgClass: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300' },
  swimming:  { label: 'Swimming',   color: '#818cf8', colorClass: 'text-violet-400', borderClass: 'border-violet-500/40', bgClass: 'bg-violet-500/15 hover:bg-violet-500/25 text-violet-300' },
  waterpolo: { label: 'Water Polo', color: '#06b6d4', colorClass: 'text-cyan-400',   borderClass: 'border-cyan-500/40',   bgClass: 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300' },
};

function PortalLoginInner() {
  const searchParams = useSearchParams();
  const sport = searchParams.get('sport') || 'hockey';
  const cfg = SPORT_CONFIG[sport] || SPORT_CONFIG.hockey;
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
        body: JSON.stringify({ code: code.trim(), sport }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Access denied.'); setLoading(false); return; }
      window.location.href = `/portal?sport=${sport}`;
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

      <section className="relative z-10 w-full max-w-sm rounded-[2rem] border border-white/6 bg-[rgba(255,255,255,0.01)]/95 p-8 shadow-2xl ring-1 ring-white/5">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-xl ring-1 ring-white/10">
            <Image src="/st-benedicts-logo.png" alt="SBC" width={80} height={80} className="h-full w-full object-contain" priority/>
          </div>
          <p className={`text-xs font-black uppercase tracking-[0.28em] ${cfg.colorClass}`}>St Benedict's College</p>
          <h1 className="mt-2 text-3xl font-black text-white">{cfg.label} Portal</h1>
          <p className="mt-2 text-sm text-white/50">Enter the portal access code to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password" required
            value={code} onChange={e => setCode(e.target.value)}
            placeholder="Access code"
            autoComplete="off"
            className="w-full rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.025)] px-4 py-3 text-center text-lg tracking-widest text-white outline-none placeholder:text-white/25 focus:border-sky-500 transition"
          />
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 text-center">{error}</div>
          )}
          <button type="submit" disabled={loading || !code.trim()}
            className={`w-full rounded-2xl border py-3 text-sm font-black transition disabled:opacity-50 ${cfg.borderClass} ${cfg.bgClass}`}>
            {loading ? 'Checking...' : 'Enter Portal'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-white/25 hover:text-white/50 transition">← Back to Departments</a>
        </div>
      </section>
    </main>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#030810'}}/>}>
      <PortalLoginInner />
    </Suspense>
  );
}
