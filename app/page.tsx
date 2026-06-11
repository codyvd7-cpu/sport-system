'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const PHOTOS = ['/sbc-photo-4.jpg', '/sbc-photo-1.jpg', '/sbc-photo-3.jpg', '/sbc-photo-2.jpg'];

const DEPARTMENTS = [
  {
    id: 'hockey',
    label: 'HOCKEY',
    lines: ['Teams · Attendance', 'Performance'],
    href: '/portal?sport=hockey',
    available: true,
    icon: '/icon-hockey.svg',
  },
  {
    id: 'hp',
    label: 'HP CLASSES',
    lines: ['Testing · Trends', 'Athletes'],
    href: '/hp-login',
    available: true,
    icon: '/icon-hp.svg',
  },
  {
    id: 'rugby',
    label: 'RUGBY',
    lines: ['Teams · Attendance', 'Performance'],
    href: '/portal?sport=rugby',
    available: true,
    icon: '/icon-rugby.svg',
  },
  {
    id: 'cricket',
    label: 'CRICKET',
    lines: ['Coming soon'],
    href: '#',
    available: false,
    icon: '/icon-cricket.svg',
  },
];

const ACCENT = '#38bdf8';

export default function LandingPage() {
  const [activePhoto, setActivePhoto] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setActivePhoto(p => (p + 1) % PHOTOS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const fadeIn = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(18px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .anton { font-family: 'Anton', Impact, sans-serif; }
        .dept-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .dept-card:hover { transform: translateY(-3px); }
        .dept-cta { transition: background 0.2s ease, transform 0.2s ease; }
        .dept-card:hover .dept-cta { transform: scale(1.08); }
      `}</style>

      <main className="relative min-h-screen bg-[#040810] text-white overflow-hidden flex flex-col">

        {/* ── BACKGROUND PHOTOS ── */}
        <div className="absolute inset-0 hidden sm:grid grid-cols-4">
          {PHOTOS.map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{filter:'saturate(0.45) brightness(0.3)'}} priority={i===0}/>
              {i > 0 && <div className="absolute inset-y-0 left-0 w-px bg-white/5"/>}
            </div>
          ))}
        </div>

        {/* Mobile: rotating photo */}
        <div className="absolute inset-0 sm:hidden">
          {PHOTOS.map((src, i) => (
            <div key={i} className="absolute inset-0 transition-opacity duration-1000"
              style={{opacity: i === activePhoto ? 1 : 0}}>
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{filter:'saturate(0.45) brightness(0.3)'}} priority={i===0}/>
            </div>
          ))}
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040810]/70 via-[#040810]/20 to-[#040810]/90 pointer-events-none"/>
        <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 60% 70% at 50% 45%, rgba(4,8,16,0.35), transparent)'}}/>

        {/* ── CONTENT ── */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-4 py-10 sm:py-12">

          {/* ── HERO ── */}
          <div className="flex flex-col items-center text-center">

            {/* Logo — no background box */}
            <div style={fadeIn(0)} className="mb-5">
              <div style={{filter:'drop-shadow(0 8px 24px rgba(0,0,0,0.6))'}}>
                <Image src="/sb-logo-hd.png" alt="SBC" width={72} height={72}
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain" priority/>
              </div>
            </div>

            {/* School name */}
            <div style={fadeIn(80)} className="mb-1">
              <p style={{fontSize:13,fontWeight:400,letterSpacing:'0.18em',color:'rgba(255,255,255,0.85)'}}>
                ST BENEDICT&apos;S COLLEGE
              </p>
            </div>
            <div style={fadeIn(100)} className="mb-8">
              <p style={{fontSize:10,fontWeight:400,letterSpacing:'0.2em',color:'rgba(255,255,255,0.35)'}}>
                EST. 1958 &nbsp;·&nbsp; BEDFORDVIEW
              </p>
            </div>

            {/* Headline */}
            <div style={fadeIn(180)} className="mb-3">
              <h1 className="anton leading-none text-center">
                <span className="block text-white" style={{fontSize:'clamp(3.2rem,9vw,6.5rem)',letterSpacing:'0.04em'}}>
                  DRIVEN BY
                </span>
                <span className="block" style={{
                  fontSize:'clamp(3.2rem,9vw,6.5rem)',
                  letterSpacing:'0.04em',
                  fontStyle:'italic',
                  color:ACCENT,
                  textShadow:'0 0 60px rgba(56,189,248,0.35), 0 0 120px rgba(56,189,248,0.15)',
                }}>
                  EXCELLENCE
                </span>
              </h1>
            </div>

            {/* Divider */}
            <div style={{...fadeIn(260),width:60,height:2,background:`linear-gradient(90deg,transparent,${ACCENT}80,transparent)`,marginBottom:20}}/>

            {/* Tagline */}
            <p style={{...fadeIn(300),fontSize:14,fontWeight:400,color:'rgba(255,255,255,0.55)',lineHeight:1.7,maxWidth:380,letterSpacing:'0.01em'}}>
              A unified performance platform for athletes,<br/>coaches and teams.
            </p>
          </div>

          {/* ── CARDS ── */}
          <div style={{...fadeIn(400),maxWidth:860}} className="w-full mt-10 sm:mt-12">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mx-auto" style={{maxWidth:860}}>
              {DEPARTMENTS.map((dept) => {
                const card = (
                  <div className={`dept-card rounded-2xl flex flex-col items-center text-center overflow-hidden ${dept.available ? 'cursor-pointer' : ''}`}
                    style={{
                      background: dept.available ? 'rgba(8,14,35,0.82)' : 'rgba(8,14,30,0.6)',
                      border: `1px solid ${dept.available ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.06)'}`,
                      backdropFilter: 'blur(12px)',
                      padding: '28px 20px 22px',
                      minHeight: 220,
                    }}>

                    {/* Icon */}
                    <div className="flex-1 flex items-center justify-center mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dept.icon} alt={dept.label}
                        style={{
                          width:64, height:64,
                          objectFit:'contain',
                          opacity: dept.available ? 1 : 0.25,
                          filter: dept.available ? `brightness(0) saturate(100%) invert(70%) sepia(60%) saturate(400%) hue-rotate(185deg) brightness(110%)` : 'grayscale(1) brightness(0.5)',
                        }}/>
                    </div>

                    {/* Label */}
                    <p style={{
                      fontSize:15,
                      fontWeight:800,
                      letterSpacing:'0.1em',
                      color: dept.available ? 'white' : 'rgba(255,255,255,0.3)',
                      marginBottom:6,
                    }}>
                      {dept.label}
                    </p>

                    {/* Sub-text */}
                    <div style={{marginBottom:18, minHeight:32}}>
                      {dept.lines.map((line, i) => (
                        <p key={i} style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.6,letterSpacing:'0.02em'}}>
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* CTA */}
                    {dept.available ? (
                      <div className="dept-cta flex items-center justify-center rounded-full"
                        style={{width:38,height:38,background:ACCENT}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width:16,height:16}}>
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center rounded-full"
                        style={{width:38,height:38,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} style={{width:16,height:16}}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                    )}
                  </div>
                );

                return dept.available ? (
                  <Link key={dept.id} href={dept.href}
                    onClick={() => {
                      if (dept.id !== 'hp') document.cookie = `portal_sport=${dept.id};path=/;max-age=86400`;
                    }}>
                    {card}
                  </Link>
                ) : (
                  <div key={dept.id}>{card}</div>
                );
              })}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={fadeIn(600)} className="mt-10 flex flex-col items-center gap-2">
            <p style={{fontSize:9,fontWeight:700,letterSpacing:'0.4em',color:'rgba(56,189,248,0.5)',textTransform:'uppercase'}}>
              Veritas In Caritate
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5"
              style={{fontSize:9,color:'rgba(255,255,255,0.2)',letterSpacing:'0.03em'}}>
              <span>KINETIQ Sport is a product of Altus (Pty) Ltd. Reg. 2026/424230/07</span>
              <span>·</span>
              <Link href="/privacy" className="hover:text-white/40 transition-colors">Privacy</Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-white/40 transition-colors">Terms</Link>
              <span>·</span>
              <span>© {new Date().getFullYear()} All rights reserved.</span>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
