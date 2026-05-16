'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const DEPARTMENTS = [
  { id: 'hockey', label: 'Hockey', href: '/portal', icon: '🏑', color: 'sky', available: true },
  { id: 'hp', label: 'HP Classes', href: '/hp-login', icon: '⚡', color: 'emerald', available: true },
  { id: 'rugby', label: 'Rugby', href: '#', icon: '🏉', color: 'slate', available: false },
  { id: 'cricket', label: 'Cricket', href: '#', icon: '🏏', color: 'slate', available: false },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#040810] text-white overflow-hidden flex flex-col items-center justify-between py-12 px-4">

      {/* Full bleed photo background */}
      <div className="absolute inset-0 grid grid-cols-4">
        {['/sbc-photo-4.jpg', '/sbc-photo-1.jpg', '/sbc-photo-3.jpg', '/sbc-photo-2.jpg'].map((src, i) => (
          <div key={i} className="relative overflow-hidden">
            <Image src={src} alt="" fill className="object-cover object-center"
              style={{ filter: 'saturate(0.6) brightness(0.28)' }} priority />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(4,8,16,0.4),transparent)]" />

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center text-center mt-4">
        <div className="mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-2xl ring-2 ring-white/20">
          <Image src="/sb-logo-hd.png" alt="SBC" width={88} height={88} className="h-full w-full object-contain" priority />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-300/80 mb-3">St Benedict's College</p>
        <h1 className="font-black text-white leading-none" style={{ fontSize: 'clamp(2.2rem,6vw,4.5rem)', letterSpacing: '-0.02em' }}>
          HIGH PERFORMANCE
        </h1>
        <p className="font-black text-slate-300/60 tracking-[0.15em] uppercase mt-2" style={{ fontSize: 'clamp(0.8rem,2vw,1.2rem)' }}>
          Operations Platform
        </p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Veritas In Caritate</p>
      </div>

      {/* Department cards — overlaid on background */}
      <div className="relative z-10 w-full max-w-3xl mt-10">
        <p className="text-center text-[9px] font-black uppercase tracking-[0.35em] text-slate-400/60 mb-4">Select Department</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DEPARTMENTS.map(dept => {
            const card = (
              <div className={`group flex flex-col items-center gap-2.5 rounded-2xl px-3 py-4 text-center transition-all duration-200 backdrop-blur-md ${
                dept.available
                  ? 'border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 cursor-pointer'
                  : 'border border-white/5 bg-white/3 cursor-not-allowed opacity-30'
              }`}>
                <span className="text-3xl">{dept.icon}</span>
                <div>
                  <p className={`text-sm font-black ${dept.available ? 'text-white' : 'text-slate-500'}`}>{dept.label}</p>
                  {!dept.available && <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 mt-0.5">Coming soon</p>}
                </div>
                {dept.available && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                    className="h-3.5 w-3.5 text-white/50 transition-transform group-hover:translate-x-1">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                )}
              </div>
            );
            return dept.available
              ? <Link key={dept.id} href={dept.href}>{card}</Link>
              : <div key={dept.id}>{card}</div>;
          })}
        </div>
      </div>

    </main>
  );
}