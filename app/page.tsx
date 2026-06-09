'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';

const PHOTOS = ['/sbc-photo-4.jpg', '/sbc-photo-1.jpg', '/sbc-photo-3.jpg', '/sbc-photo-2.jpg'];

const DEPARTMENTS = [
  {
    id: 'hockey',
    label: 'Hockey',
    sub: 'Teams · Attendance · Performance',
    href: '/portal?sport=hockey',
    available: true,
    color: '#38bdf8',
    glow: 'rgba(56,189,248,0.15)',
    border: 'rgba(56,189,248,0.25)',
    icon: '/icon-hockey.svg',
  },
  {
    id: 'hp',
    label: 'HP Classes',
    sub: 'Testing · Trends · Athletes',
    href: '/hp-login',
    available: true,
    color: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
    border: 'rgba(16,185,129,0.25)',
    icon: '/icon-hp.svg',
  },
  {
    id: 'rugby',
    label: 'Rugby',
    sub: 'Teams · Attendance · Performance',
    href: '/portal?sport=rugby',
    available: true,
    color: '#f87171',
    glow: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.22)',
    icon: '/icon-rugby.svg',
  },
  {
    id: 'cricket',
    label: 'Cricket',
    sub: 'Coming soon',
    href: '#',
    available: false,
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.12)',
    icon: '/icon-cricket.svg',
  },
];

export default function LandingPage() {
  const [activePhoto, setActivePhoto] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setActivePhoto(p => (p + 1) % PHOTOS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .anton { font-family: 'Anton', Impact, sans-serif; }

        @keyframes heroIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lineIn {
          from { width: 0; opacity: 0; }
          to   { width: 100%; opacity: 1; }
        }
        @keyframes photoPan {
          from { transform: scale(1.05); }
          to   { transform: scale(1); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }

        .hero-in   { animation: heroIn 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .card-in   { animation: cardIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .photo-pan { animation: photoPan 8s ease-out forwards; }
        .pulse-slow{ animation: pulse-slow 2.5s ease-in-out infinite; }

        .dept-card {
          position: relative;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1),
                      box-shadow 0.3s ease,
                      border-color 0.3s ease;
        }
        .dept-card::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.3s ease;
          background: radial-gradient(ellipse at 50% 0%, var(--glow) 0%, transparent 70%);
        }
        .dept-card:hover::before { opacity: 1; }
        .dept-card.available:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--border-col);
        }
        .dept-card .accent-line {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .dept-card.available:hover .accent-line { transform: scaleX(1); }
        .dept-card .arrow-icon {
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease;
          opacity: 0;
        }
        .dept-card.available:hover .arrow-icon {
          transform: translateX(4px);
          opacity: 1;
        }
        .dept-card .icon-wrap {
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .dept-card.available:hover .icon-wrap {
          transform: scale(1.08);
        }
      `}</style>

      <main className="relative min-h-screen bg-[#040810] text-white overflow-hidden flex flex-col">

        {/* ── BACKGROUND PHOTOS ── */}
        {/* Desktop: 4 panels */}
        <div className="absolute inset-0 hidden sm:grid grid-cols-4">
          {PHOTOS.map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <div className="absolute inset-0 photo-pan">
                <Image src={src} alt="" fill className="object-cover object-center"
                  style={{ filter: 'saturate(0.5) brightness(0.28)' }} priority={i === 0}/>
              </div>
              {/* Vertical divider */}
              {i > 0 && <div className="absolute inset-y-0 left-0 w-px bg-white/5"/>}
            </div>
          ))}
        </div>

        {/* Mobile: single rotating */}
        <div className="absolute inset-0 sm:hidden">
          {PHOTOS.map((src, i) => (
            <div key={i} className="absolute inset-0 transition-opacity duration-1500"
              style={{ opacity: i === activePhoto ? 1 : 0 }}>
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{ filter: 'saturate(0.5) brightness(0.28)' }} priority={i === 0}/>
            </div>
          ))}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040810]/80 via-transparent to-[#040810]/95 pointer-events-none"/>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgba(4,8,16,0.5),transparent)] pointer-events-none"/>
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")'}}/>

        {/* ── CONTENT ── */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">

          {/* ── HERO ── */}
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className={`mb-7 ${mounted ? 'hero-in' : 'opacity-0'}`} style={{animationDelay:'0ms'}}>
              <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-[20px] bg-white shadow-2xl ring-1 ring-white/30" style={{boxShadow:'0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)'}}>
                <Image src="/sb-logo-hd.png" alt="SBC" width={76} height={76} className="h-[76%] w-[76%] object-contain" priority/>
              </div>
            </div>

            {/* School name */}
            <div className={`mb-6 ${mounted ? 'hero-in' : 'opacity-0'}`} style={{animationDelay:'80ms'}}>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">
                St Benedict's College
              </p>
              <p className="mt-1 text-[8px] font-medium uppercase tracking-[0.25em] text-white/20">
                Est. 1958 &nbsp;·&nbsp; Bedfordview
              </p>
            </div>

            {/* Headline */}
            <div className={`mb-4 ${mounted ? 'hero-in' : 'opacity-0'}`} style={{animationDelay:'160ms'}}>
              <h1 className="anton leading-none">
                <span className="block text-white" style={{fontSize:'clamp(3rem,10vw,7rem)',letterSpacing:'0.02em'}}>
                  DRIVEN BY
                </span>
                <span className="block" style={{fontSize:'clamp(3rem,10vw,7rem)',letterSpacing:'0.02em',fontStyle:'italic',color:'#38bdf8',textShadow:'0 0 80px rgba(56,189,248,0.3), 0 0 160px rgba(56,189,248,0.1)'}}>
                  EXCELLENCE
                </span>
              </h1>
            </div>

            {/* Animated underline */}
            <div className={`mb-6 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent ${mounted ? 'hero-in' : 'opacity-0'}`}
              style={{width:'120px',animationDelay:'320ms'}}/>

            {/* Tagline */}
            <p className={`text-[13px] font-light text-white/40 tracking-[0.08em] max-w-xs leading-relaxed ${mounted ? 'hero-in' : 'opacity-0'}`}
              style={{animationDelay:'380ms'}}>
              A unified performance platform for athletes, coaches and teams
            </p>
          </div>

          {/* ── DEPARTMENT CARDS ── */}
          <div className="w-full max-w-2xl mt-10 sm:mt-12">
            <p className={`text-center text-[9px] font-black uppercase tracking-[0.35em] text-white/20 mb-5 ${mounted ? 'hero-in' : 'opacity-0'}`}
              style={{animationDelay:'440ms'}}>
              Select Department
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-stretch">
              {DEPARTMENTS.map((dept, i) => {
                const inner = (
                  <div
                    className={`dept-card ${dept.available ? 'available' : ''} rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3 text-center backdrop-blur-sm border h-full justify-between`}
                    style={{
                      '--glow': dept.glow,
                      '--border-col': dept.border,
                      background: dept.available
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(255,255,255,0.02)',
                      borderColor: dept.available
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.04)',
                    } as React.CSSProperties}
                  >
                    {/* Top accent line */}
                    <div className="accent-line rounded-full" style={{background:`linear-gradient(90deg, transparent, ${dept.color}, transparent)`}}/>

                    {/* Icon */}
                    <div className="icon-wrap relative">
                      <Image src={dept.icon} alt={dept.label} width={56} height={56}
                        className={`h-12 w-12 sm:h-14 sm:w-14 object-contain transition-all duration-300 ${dept.available ? 'opacity-75' : 'opacity-20'}`}/>
                      {/* Glow under icon */}
                      {dept.available && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-8 blur-lg rounded-full opacity-0 group-hover:opacity-100"
                          style={{background:dept.color}}/>
                      )}
                    </div>

                    {/* Label */}
                    <div>
                      <p className={`text-sm font-black tracking-wide leading-none ${dept.available ? 'text-white' : 'text-white/25'}`}>
                        {dept.label}
                      </p>
                      <p className={`mt-1 text-[9px] tracking-wide ${dept.available ? 'text-white/35' : 'text-white/15'}`}>
                        {dept.sub}
                      </p>
                    </div>

                    {/* CTA / coming soon */}
                    {dept.available ? (
                      <div className="flex items-center gap-1 arrow-icon">
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{color:dept.color}}>Enter</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3" style={{color:dept.color}}>
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="pulse-slow h-1.5 w-1.5 rounded-full" style={{background:dept.color}}/>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">In development</span>
                      </div>
                    )}
                  </div>
                );

                return (
                  <div key={dept.id}
                    className={`h-full ${mounted ? 'card-in' : 'opacity-0'}`}
                    style={{animationDelay:`${500 + i * 80}ms`}}>
                    {dept.available
                      ? <Link href={dept.href} className="block h-full"
                          onClick={() => {
                            if (dept.id !== 'hp') {
                              document.cookie = `portal_sport=${dept.id};path=/;max-age=86400`;
                            }
                          }}>{inner}</Link>
                      : inner
                    }
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className={`mt-10 flex flex-col items-center gap-2 ${mounted ? 'hero-in' : 'opacity-0'}`}
            style={{animationDelay:'800ms'}}>
            <div className="h-px w-16 bg-white/10 mb-1"/>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/15">
              Veritas In Caritate
            </p>
            <p className="text-[8px] text-white/10 font-medium mt-1">
              KINETIQ Sport is a product of Altus (Pty) Ltd (Reg. 2026/424230/07)
            </p>
            <div className="flex items-center gap-3 text-[8px] text-white/10 font-medium tracking-widest uppercase mt-1">
              <Link href="/privacy" className="hover:text-white/30 transition-colors">Privacy</Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-white/30 transition-colors">Terms</Link>
              <span>·</span>
              <span>© {new Date().getFullYear()} Altus (Pty) Ltd · Reg. 2026/424230/07</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}