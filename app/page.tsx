'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const DEPARTMENTS = [
  { id: 'hockey', label: 'Hockey', href: '/portal', icon: '🏑', available: true },
  { id: 'hp', label: 'HP Classes', href: '/hp-login', icon: '⚡', available: true },
  { id: 'rugby', label: 'Rugby', href: '#', icon: '🏉', available: false },
  { id: 'cricket', label: 'Cricket', href: '#', icon: '🏏', available: false },
];

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Anton&display=swap');
        .driven { font-family: 'Anton', 'Bebas Neue', Impact, sans-serif; }
        .excellence { font-family: 'Bebas Neue', Impact, sans-serif; font-style: italic; color: #38bdf8; }
      `}</style>

      <main className="relative min-h-screen bg-[#040810] text-white overflow-hidden flex flex-col items-center justify-between py-10 px-4">

        {/* ── PHOTO PANELS ─────────────────────── */}
        <div className="absolute inset-0 grid grid-cols-4">
          {['/sbc-photo-4.jpg', '/sbc-photo-1.jpg', '/sbc-photo-3.jpg', '/sbc-photo-2.jpg'].map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{ filter: 'saturate(0.5) brightness(0.25)' }} priority />
            </div>
          ))}
        </div>

        {/* Dark overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_50%_42%,rgba(4,8,20,0.55),transparent)]" />

        {/* ── HERO ─────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center text-center mt-2">
          {/* Logo */}
          <div className="mb-5 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl ring-2 ring-white/20">
            <Image src="/sb-logo-hd.png" alt="SBC" width={88} height={88} className="h-full w-full object-contain" priority />
          </div>

          {/* School name */}
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] text-white/60 mb-1">
            St Benedict's College
          </p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">
            Est. 1958
          </p>

          {/* DRIVEN BY EXCELLENCE */}
          <div className="leading-none mb-2">
            <div className="driven text-[clamp(3rem,10vw,7rem)] font-black uppercase text-white leading-none tracking-wide">
              DRIVEN BY
            </div>
            <div className="excellence text-[clamp(3rem,10vw,7rem)] font-black uppercase leading-none tracking-wide"
              style={{ fontStyle: 'italic', color: '#38bdf8', textShadow: '0 0 40px rgba(56,189,248,0.3)' }}>
              EXCELLENCE
            </div>
          </div>

          {/* Subtitle */}
          <p className="mt-3 text-sm text-slate-400/80 max-w-xs leading-relaxed">
            A unified performance platform<br/>for athletes, coaches and teams.
          </p>

          {/* Motto */}
          <div className="mt-5 flex flex-col items-center gap-1">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-sky-400/50">Veritas In Caritate</p>
          </div>
        </div>

        {/* ── DEPARTMENT CARDS ─────────────────── */}
        <div className="relative z-10 w-full max-w-3xl mt-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DEPARTMENTS.map(dept => {
              const card = (
                <div className={`group flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center transition-all duration-200 backdrop-blur-md border ${
                  dept.available
                    ? 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 cursor-pointer'
                    : 'border-white/5 bg-white/3 cursor-not-allowed opacity-30'
                }`}>
                  <span className="text-3xl">{dept.icon}</span>
                  <p className={`text-sm font-black ${dept.available ? 'text-white' : 'text-slate-500'}`}>{dept.label}</p>
                  {!dept.available
                    ? <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">Coming soon</p>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5 text-white/40 transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  }
                </div>
              );
              return dept.available
                ? <Link key={dept.id} href={dept.href}>{card}</Link>
                : <div key={dept.id}>{card}</div>;
            })}
          </div>
        </div>

      </main>
    </>
  );
}