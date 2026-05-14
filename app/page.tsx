'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const DEPARTMENTS = [
  {
    id: 'hockey',
    name: 'Hockey',
    subtitle: 'First XV through U14 — all teams, testing and portal',
    href: '/portal',
    icon: '🏑',
    color: 'sky',
    stats: ['18 teams', '291 players', 'Live portal'],
    available: true,
  },
  {
    id: 'hp',
    name: 'HP Classes',
    subtitle: 'Grade 8 & 9 high performance training periods',
    href: '/login?redirect=/hp',
    icon: '⚡',
    color: 'emerald',
    stats: ['Grade 8 & 9', 'Term testing', 'Attendance'],
    available: true,
  },
  {
    id: 'rugby',
    name: 'Rugby',
    subtitle: 'Coming soon',
    href: '#',
    icon: '🏉',
    color: 'slate',
    stats: ['Coming soon'],
    available: false,
  },
  {
    id: 'cricket',
    name: 'Cricket',
    subtitle: 'Coming soon',
    href: '#',
    icon: '🏏',
    color: 'slate',
    stats: ['Coming soon'],
    available: false,
  },
];

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; badge: string; hover: string }> = {
  sky:     { border: 'border-sky-500/30',     bg: 'bg-sky-500/5',     text: 'text-sky-400',     badge: 'bg-sky-500/15 text-sky-300',     hover: 'hover:border-sky-500/60 hover:bg-sky-500/10' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300', hover: 'hover:border-emerald-500/60 hover:bg-emerald-500/10' },
  slate:   { border: 'border-slate-700/50',   bg: 'bg-slate-900/50',  text: 'text-slate-500',   badge: 'bg-slate-800 text-slate-500',     hover: '' },
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#06071a] text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(14,165,233,0.08),transparent)]" />
      <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-sky-500/8 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-emerald-500/8 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">

        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-white p-2 shadow-2xl shadow-sky-500/10 ring-1 ring-white/10">
            <Image src="/st-benedicts-logo.png" alt="St Benedict's College" width={80} height={80} className="h-full w-full object-contain" priority />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-400">St Benedict's College</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
            High Performance
          </h1>
          <p className="mt-2 text-2xl font-black text-slate-400 sm:text-3xl">Operations Platform</p>
          <p className="mt-4 text-sm text-slate-500">Select a department to continue</p>
        </div>

        {/* Department cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {DEPARTMENTS.map((dept) => {
            const col = COLOR_MAP[dept.color];
            const card = (
              <div className={`group relative rounded-3xl border p-6 transition-all duration-200 ${col.border} ${col.bg} ${dept.available ? col.hover + ' cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${dept.available ? 'bg-white/5' : 'bg-slate-800/50'}`}>
                    {dept.icon}
                  </div>
                  {!dept.available && (
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Soon</span>
                  )}
                </div>
                <div className="mt-4">
                  <h2 className={`text-2xl font-black ${dept.available ? 'text-white' : 'text-slate-500'}`}>{dept.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{dept.subtitle}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {dept.stats.map((stat) => (
                      <span key={stat} className={`rounded-full px-2.5 py-1 text-[10px] font-black ${col.badge}`}>{stat}</span>
                    ))}
                  </div>
                </div>
                {dept.available && (
                  <div className={`mt-5 flex items-center gap-2 text-sm font-black ${col.text}`}>
                    Open {dept.name}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 transition group-hover:translate-x-1">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                )}
              </div>
            );

            return dept.available ? (
              <Link key={dept.id} href={dept.href}>{card}</Link>
            ) : (
              <div key={dept.id}>{card}</div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-16 text-center text-xs text-slate-700">
          St Benedict's College · High Performance Operations Platform · 2026
        </p>
      </div>
    </main>
  );
}