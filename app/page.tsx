'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const DEPARTMENTS = [
  {
    id: 'hockey',
    label: 'Hockey',
    href: '/portal',
    icon: '🏑',
    color: 'sky',
    available: true,
  },
  {
    id: 'hp',
    label: 'HP Classes',
    href: '/hp-login',
    icon: '⚡',
    color: 'emerald',
    available: true,
  },
  {
    id: 'rugby',
    label: 'Rugby',
    href: '#',
    icon: '🏉',
    color: 'slate',
    available: false,
  },
  {
    id: 'cricket',
    label: 'Cricket',
    href: '#',
    icon: '🏏',
    color: 'slate',
    available: false,
  },
];

export default function LandingPage() {
  return (
    <main className="relative h-screen bg-[#040810] text-white overflow-hidden flex flex-col">

      {/* ── FULL BLEED PHOTO BACKGROUND ─────────── */}
      <div className="absolute inset-0">
        {/* 4 photo panels side by side */}
        <div className="absolute inset-0 grid grid-cols-4 h-full">
          {['/sbc-photo-4.jpg', '/sbc-photo-1.jpg', '/sbc-photo-3.jpg', '/sbc-photo-2.jpg'].map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image
                src={src} alt="" fill
                className="object-cover object-center"
                style={{ filter: 'saturate(0.7) brightness(0.35)' }}
                priority
              />
            </div>
          ))}
        </div>

        {/* Dark overlay gradient — heavier in centre for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/85" />

        {/* Vertical separators between panels — subtle */}
        <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
          {[1,2,3].map(i => (
            <div key={i} className="border-r border-white/5 col-span-1" style={{ gridColumnStart: i }} />
          ))}
        </div>

        {/* Centre vignette for logo area */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_40%,rgba(4,8,16,0.5),transparent)]" />

        {/* Bottom dark fade for department bar */}
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black via-black/90 to-transparent" />
      </div>

      {/* ── CONTENT ────────────────────────────── */}
      <div className="relative flex flex-1 flex-col" style={{ minHeight: "100vh" }}>

        {/* Hero — vertically centered */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-16 text-center">

          {/* Logo */}
          <div className="mb-7 relative">
            <div className="absolute inset-0 scale-110 rounded-2xl bg-white/5 blur-2xl" />
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-2xl ring-2 ring-white/20">
              <Image src="/sb-logo-hd.png" alt="St Benedict's College" width={88} height={88} className="h-full w-full object-contain" priority />
            </div>
          </div>

          {/* School name */}
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-300/80 mb-3">
            St Benedict's College
          </p>

          {/* Main heading */}
          <h1 className="font-black text-white leading-none mb-2"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', letterSpacing: '-0.02em' }}>
            HIGH PERFORMANCE
          </h1>
          <p className="font-black text-slate-300/70 tracking-[0.15em] uppercase mb-2"
            style={{ fontSize: 'clamp(0.9rem, 2vw, 1.4rem)' }}>
            Operations Platform
          </p>

          {/* Motto */}
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            Veritas In Caritate
          </p>
        </div>

        {/* ── DEPARTMENT BAR ────────────────────── */}
        <div className="relative border-t border-white/8 bg-black">
          <div className="mx-auto max-w-4xl px-4 py-6">
            <p className="text-center text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 mb-5">
              Select Department
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DEPARTMENTS.map(dept => {
                const content = (
                  <div className={`group flex flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-center transition-all duration-200 ${
                    dept.available
                      ? dept.color === 'sky'
                        ? 'border-sky-500/25 bg-sky-500/8 hover:border-sky-400/50 hover:bg-sky-500/15 cursor-pointer'
                        : 'border-emerald-500/25 bg-emerald-500/8 hover:border-emerald-400/50 hover:bg-emerald-500/15 cursor-pointer'
                      : 'border-slate-800/60 bg-slate-900/20 opacity-40 cursor-not-allowed'
                  }`}>
                    <span className="text-3xl">{dept.icon}</span>
                    <div>
                      <p className={`text-sm font-black ${dept.available ? 'text-white' : 'text-slate-500'}`}>
                        {dept.label}
                      </p>
                      {!dept.available && (
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-600 mt-0.5">Coming soon</p>
                      )}
                    </div>
                    {dept.available && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                        className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ${dept.color === 'sky' ? 'text-sky-400' : 'text-emerald-400'}`}>
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    )}
                  </div>
                );

                return dept.available ? (
                  <Link key={dept.id} href={dept.href}>{content}</Link>
                ) : (
                  <div key={dept.id}>{content}</div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}