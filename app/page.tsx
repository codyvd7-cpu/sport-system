'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const PHOTOS = ['/sbc-photo-4.jpg', '/sbc-photo-1.jpg', '/sbc-photo-3.jpg', '/sbc-photo-2.jpg'];

const DEPARTMENTS = [
  { id: 'hockey',  label: 'Hockey',     href: '/portal',   available: true },
  { id: 'hp',      label: 'HP Classes', href: '/hp-login', available: true },
  { id: 'rugby',   label: 'Rugby',      href: '#',         available: false },
  { id: 'cricket', label: 'Cricket',    href: '#',         available: false },
];

// Clean professional sport icons
const HockeyIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9">
    <path d="M8 38 Q16 28 28 26 Q38 24 42 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <path d="M8 38 L12 42 Q14 44 17 43 L22 41" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="10" cy="40" r="2.5" fill="currentColor"/>
    <path d="M32 12 L36 8 M36 14 L40 10 M38 18 L42 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const HPIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9">
    <path d="M10 38 L20 14 L28 30 L34 20 L40 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="24" cy="10" r="4" stroke="currentColor" strokeWidth="2.5" fill="none"/>
    <path d="M20 20 L28 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const RugbyIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9">
    <ellipse cx="24" cy="24" rx="13" ry="8" transform="rotate(-30 24 24)" stroke="currentColor" strokeWidth="2.5" fill="none"/>
    <path d="M16 16 L32 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M13 20 L17 16 M20 13 L16 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M31 28 L35 32 M28 31 L32 35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const CricketIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9">
    <path d="M28 8 L40 12 L36 24 L24 20 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
    <path d="M28 8 L10 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M6 40 L10 44 M10 40 L14 44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const ICONS: Record<string, React.ReactNode> = {
  hockey: <HockeyIcon />,
  hp: <HPIcon />,
  rugby: <RugbyIcon />,
  cricket: <CricketIcon />,
};

export default function LandingPage() {
  const [activePhoto, setActivePhoto] = React.useState(0);

  // Auto-rotate photos on mobile
  React.useEffect(() => {
    const timer = setInterval(() => {
      setActivePhoto(p => (p + 1) % PHOTOS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');
        .anton { font-family: 'Anton', Impact, sans-serif; }
      `}</style>

      <main className="relative min-h-screen bg-[#040810] text-white overflow-hidden flex flex-col items-center justify-between py-10 px-4">

        {/* ── DESKTOP: 4 photo panels ─────────── */}
        <div className="absolute inset-0 hidden sm:grid grid-cols-4">
          {PHOTOS.map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{ filter: 'saturate(0.5) brightness(0.25)' }} priority={i === 0} />
            </div>
          ))}
        </div>

        {/* ── MOBILE: single rotating image ───── */}
        <div className="absolute inset-0 sm:hidden">
          {PHOTOS.map((src, i) => (
            <div key={i} className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: i === activePhoto ? 1 : 0 }}>
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{ filter: 'saturate(0.5) brightness(0.25)' }} priority={i === 0} />
            </div>
          ))}
          {/* Dots indicator */}
          <div className="absolute bottom-36 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {PHOTOS.map((_, i) => (
              <button key={i} onClick={() => setActivePhoto(i)}
                className={`h-1 rounded-full transition-all duration-300 ${i === activePhoto ? 'w-4 bg-white' : 'w-1 bg-white/30'}`} />
            ))}
          </div>
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_50%_42%,rgba(4,8,20,0.55),transparent)]" />

        {/* ── HERO ─────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center text-center mt-2">
          <div className="mb-5 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl ring-2 ring-white/20">
            <Image src="/sb-logo-hd.png" alt="SBC" width={88} height={88} className="h-full w-full object-contain" priority />
          </div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] text-white/60 mb-0.5">St Benedict's College</p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-6">Est. 1958</p>

          <div className="leading-none mb-3">
            <div className="anton text-white leading-none" style={{ fontSize: 'clamp(2.8rem,9vw,6.5rem)', letterSpacing: '0.02em' }}>
              DRIVEN BY
            </div>
            <div className="anton leading-none" style={{ fontSize: 'clamp(2.8rem,9vw,6.5rem)', letterSpacing: '0.02em', fontStyle: 'italic', color: '#38bdf8', textShadow: '0 0 60px rgba(56,189,248,0.25)' }}>
              EXCELLENCE
            </div>
          </div>

          <p className="text-sm text-slate-400/80 max-w-xs leading-relaxed">
            A unified performance platform<br/>for athletes, coaches and teams.
          </p>

          <p className="mt-5 text-[9px] font-black uppercase tracking-[0.4em] text-sky-400/40">
            Veritas In Caritate
          </p>
        </div>

        {/* ── DEPARTMENT CARDS ─────────────────── */}
        <div className="relative z-10 w-full max-w-3xl mt-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DEPARTMENTS.map(dept => {
              const card = (
                <div className={`group flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center transition-all duration-200 backdrop-blur-md border ${
                  dept.available
                    ? 'border-white/10 bg-white/5 hover:bg-white/12 hover:border-white/20 cursor-pointer'
                    : 'border-white/4 bg-white/3 cursor-not-allowed opacity-30'
                }`}>
                  <div className="text-white/60 group-hover:text-white/90 transition-colors">
                    {ICONS[dept.id]}
                  </div>
                  <p className={`text-sm font-black tracking-wide ${dept.available ? 'text-white' : 'text-slate-500'}`}>
                    {dept.label}
                  </p>
                  {!dept.available
                    ? <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Coming soon</p>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3 text-white/30 group-hover:text-white/60 transition-all group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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