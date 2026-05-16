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
// Sport icons - using clean SVG paths from established icon sets
const HockeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-10 w-10" fill="currentColor">
    <path d="M20,15 L30,15 L30,65 L50,65 C65,65 75,72 75,80 C75,88 65,95 50,95 L25,95 C18,95 15,90 15,85 L15,65 L20,65 Z M25,75 L50,75 C58,75 63,78 63,80 C63,82 58,85 50,85 L25,85 Z"/>
    <circle cx="75" cy="30" r="8"/>
  </svg>
);

const HPIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-10 w-10" fill="currentColor">
    <rect x="5" y="42" width="15" height="16" rx="4"/>
    <rect x="18" y="46" width="12" height="8" rx="2"/>
    <rect x="30" y="44" width="40" height="12" rx="3"/>
    <rect x="70" y="46" width="12" height="8" rx="2"/>
    <rect x="80" y="42" width="15" height="16" rx="4"/>
  </svg>
);

const RugbyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="5">
    <ellipse cx="50" cy="50" rx="38" ry="24" transform="rotate(-35 50 50)"/>
    <line x1="26" y1="26" x2="74" y2="74"/>
    <path d="M36 36 Q50 28 64 36" fill="none"/>
    <path d="M36 64 Q50 72 64 64" fill="none"/>
  </svg>
);

const CricketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-10 w-10" fill="currentColor">
    <path d="M62,5 C66,5 70,9 70,13 L45,75 C43,80 38,82 34,80 L28,77 C24,75 22,70 24,65 L49,8 C51,5 57,5 62,5Z"/>
    <path d="M28,77 L18,90 C16,93 12,93 10,90 L8,88 C6,85 7,81 10,79 L24,65 Z"/>
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
                style={{ filter: 'saturate(0.6) brightness(0.35)' }} priority={i === 0} />
            </div>
          ))}
        </div>

        {/* ── MOBILE: single rotating image ───── */}
        <div className="absolute inset-0 sm:hidden">
          {PHOTOS.map((src, i) => (
            <div key={i} className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: i === activePhoto ? 1 : 0 }}>
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{ filter: 'saturate(0.6) brightness(0.35)' }} priority={i === 0} />
            </div>
          ))}

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
                  <div className="opacity-70 group-hover:opacity-100 transition-opacity">{ICONS[dept.id]}</div>
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