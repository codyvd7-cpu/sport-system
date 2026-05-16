'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#050A18] text-white overflow-hidden flex flex-col">

      {/* ── BACKGROUND LAYERS ─────────────────────── */}

      {/* Deep navy base gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#040810] via-[#06112a] to-[#030810]" />

      {/* Large ghost logo — centered behind everything */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[600px] w-[600px] opacity-[0.04]"
          style={{ filter: 'blur(0px) grayscale(100%) brightness(3)' }}>
          <Image src="/sb-logo-hd.png" alt="" fill className="object-contain" priority />
        </div>
      </div>

      {/* Radial glow behind logo */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[700px] w-[700px] rounded-full bg-sky-600/6 blur-[120px]" />
      </div>

      {/* Top arc glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-sky-500/8 blur-[80px]" />

      {/* Bottom corner accents */}
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-700/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-700/10 blur-3xl" />

      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Diagonal accent lines */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-full w-px bg-gradient-to-b from-transparent via-sky-500/8 to-transparent" />
        <div className="absolute top-0 right-1/4 h-full w-px bg-gradient-to-b from-transparent via-sky-500/5 to-transparent" />
        <div className="absolute left-0 top-1/3 w-full h-px bg-gradient-to-r from-transparent via-sky-500/6 to-transparent" />
      </div>

      {/* ── CONTENT ────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">

        {/* Header */}
        <div className="mb-12 text-center">
          {/* Logo with layered glow rings */}
          <div className="mx-auto mb-8 relative w-32 h-32">
            <div className="absolute inset-0 rounded-3xl bg-sky-400/20 blur-xl scale-110" />
            <div className="absolute inset-0 rounded-3xl bg-white/5 blur-md" />
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/30 p-2">
              <Image src="/sb-logo-hd.png" alt="St Benedict's College" width={100} height={100} className="h-full w-full object-contain" priority />
            </div>
          </div>

          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-sky-400/80">St Benedict's College</p>
          <h1 className="mt-3 font-black tracking-tight text-white"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.05 }}>
            High Performance
          </h1>
          <p className="mt-1 font-black text-slate-400"
            style={{ fontSize: 'clamp(1.3rem, 3vw, 2rem)' }}>
            Operations Platform
          </p>

          {/* Divider */}
          <div className="mx-auto mt-6 flex items-center gap-3 max-w-xs">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-sky-500/30" />
            <p className="text-xs text-slate-500 tracking-widest uppercase">Select Department</p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-sky-500/30" />
          </div>
        </div>

        {/* Cards */}
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Hockey */}
            <Link href="/portal" className="group">
              <div className="relative h-full rounded-3xl border border-sky-500/20 p-px transition-all duration-300 hover:border-sky-400/40 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(14,165,233,0.02))' }}>
                {/* Inner glow on hover */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'radial-gradient(circle at 30% 30%, rgba(14,165,233,0.08), transparent 70%)' }} />
                <div className="relative flex h-full flex-col p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-3xl shadow-lg">
                      🏑
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-sky-400/70">Sport Department</p>
                      <h2 className="text-2xl font-black text-white">Hockey</h2>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-5">
                    Fixtures, results, weekly updates and team news — from 1st XV to U14. Everything parents need in one place.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Fixtures & Results', 'Week Plans', 'Player Portal', '18 Squads'].map(s => (
                      <span key={s} className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black text-sky-300">{s}</span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-sm font-black text-sky-400">
                    Open Hockey
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 transition-transform group-hover:translate-x-1.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* HP Classes */}
            <Link href="/hp-login" className="group">
              <div className="relative h-full rounded-3xl border border-emerald-500/20 p-px transition-all duration-300 hover:border-emerald-400/40 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))' }}>
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.08), transparent 70%)' }} />
                <div className="relative flex h-full flex-col p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-3xl shadow-lg">
                      ⚡
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400/70">HP Department</p>
                      <h2 className="text-2xl font-black text-white">HP Classes</h2>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-5">
                    Dedicated gym training for Grade 8 & 9 — attendance tracking, fitness testing and performance trends.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Grade 8 & 9', 'Fitness Testing', 'Training Groups', 'Trends'].map(s => (
                      <span key={s} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-300">{s}</span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-sm font-black text-emerald-400">
                    Open HP Classes
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 transition-transform group-hover:translate-x-1.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* Rugby */}
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/20 p-6 opacity-40 cursor-not-allowed flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800/50 text-3xl">🏉</div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">Sport Department</p>
                    <h2 className="text-2xl font-black text-slate-500">Rugby</h2>
                  </div>
                </div>
                <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Soon</span>
              </div>
              <p className="text-sm text-slate-600">Coming soon</p>
            </div>

            {/* Cricket */}
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/20 p-6 opacity-40 cursor-not-allowed flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800/50 text-3xl">🏏</div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">Sport Department</p>
                    <h2 className="text-2xl font-black text-slate-500">Cricket</h2>
                  </div>
                </div>
                <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Soon</span>
              </div>
              <p className="text-sm text-slate-600">Coming soon</p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-[11px] text-slate-700 tracking-wider">
          St Benedict's College · High Performance Operations Platform · 2026
        </p>

      </div>
    </main>
  );
}
