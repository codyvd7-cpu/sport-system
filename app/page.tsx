'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#06071a] text-white overflow-hidden flex flex-col">

      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(14,165,233,0.12),transparent)]" />
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-sky-600/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-emerald-600/8 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-900/20 blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-white p-2 shadow-2xl shadow-sky-500/20 ring-1 ring-white/20">
            <Image src="/st-benedicts-logo.png" alt="St Benedict's College" width={96} height={96} className="h-full w-full object-contain" priority />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-sky-400">St Benedict's College</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight text-white sm:text-6xl">
            High Performance
          </h1>
          <p className="mt-1 text-2xl font-black text-slate-400 sm:text-3xl">Operations Platform</p>
          <p className="mt-5 text-sm text-slate-500">Select a department to continue</p>
        </div>

        {/* Department cards — fixed equal height grid */}
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Hockey */}
            <Link href="/portal" className="group">
              <div className="relative h-full rounded-3xl border border-sky-500/25 bg-sky-500/5 p-6 transition-all duration-200 hover:border-sky-500/50 hover:bg-sky-500/10 cursor-pointer flex flex-col">
                {/* Top row */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/20 text-3xl">
                    🏑
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">Sport Department</p>
                    <h2 className="text-2xl font-black text-white">Hockey</h2>
                  </div>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  Fixtures, results, weekly updates and team news for all squads — from 1st XV to U14.
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {['Fixtures & Results', 'Week Plans', 'Player Portal', '18 Squads'].map(s => (
                    <span key={s} className="rounded-full bg-sky-500/15 border border-sky-500/20 px-3 py-1 text-[10px] font-black text-sky-300">{s}</span>
                  ))}
                </div>

                <div className="mt-auto flex items-center gap-2 text-sm font-black text-sky-400 group-hover:gap-3 transition-all">
                  Open Hockey
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 transition group-hover:translate-x-1">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </Link>

            {/* HP Classes */}
            <Link href="/hp-login" className="group">
              <div className="relative h-full rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/10 cursor-pointer flex flex-col">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-3xl">
                    ⚡
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">HP Department</p>
                    <h2 className="text-2xl font-black text-white">HP Classes</h2>
                  </div>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  Dedicated gym training for Grade 8 & 9 — attendance tracking, fitness testing and performance trends.
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {['Grade 8 & 9', 'Fitness Testing', 'Training Groups', 'Trends'].map(s => (
                    <span key={s} className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-300">{s}</span>
                  ))}
                </div>

                <div className="mt-auto flex items-center gap-2 text-sm font-black text-emerald-400 group-hover:gap-3 transition-all">
                  Open HP Classes
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 transition group-hover:translate-x-1">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </Link>

            {/* Rugby — coming soon */}
            <div className="rounded-3xl border border-slate-700/40 bg-slate-900/30 p-6 opacity-50 cursor-not-allowed flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800/50 text-3xl">🏉</div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Sport Department</p>
                    <h2 className="text-2xl font-black text-slate-500">Rugby</h2>
                  </div>
                </div>
                <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Soon</span>
              </div>
              <p className="text-sm text-slate-600">Coming soon</p>
            </div>

            {/* Cricket — coming soon */}
            <div className="rounded-3xl border border-slate-700/40 bg-slate-900/30 p-6 opacity-50 cursor-not-allowed flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800/50 text-3xl">🏏</div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Sport Department</p>
                    <h2 className="text-2xl font-black text-slate-500">Cricket</h2>
                  </div>
                </div>
                <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Soon</span>
              </div>
              <p className="text-sm text-slate-600">Coming soon</p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-slate-700">
          St Benedict's College · High Performance Operations Platform · 2026
        </p>

      </div>
    </main>
  );
}