'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const PHOTOS = ['/sbc-hockey-1.jpg', '/sbc-rugby-1.jpg', '/sbc-photo-1.jpg', '/sbc-rugby-2.jpg'];

const DEPARTMENTS = [
  {
    id: 'hockey',
    label: 'HOCKEY',
    lines: ['Teams · Attendance', 'Performance'],
    href: '/portal?sport=hockey',
    available: true,
    icon: '/icon-hockey.svg',
    accent: '#38bdf8',
    glow: 'rgba(56,189,248,0.35)',
    hoverBg: 'rgba(56,189,248,0.18)',
    bottomGlow: 'rgba(56,189,248,0.7)',
  },
  {
    id: 'hp',
    label: 'HP CLASSES',
    lines: ['Testing · Trends', 'Athletes'],
    href: '/hp-login',
    available: true,
    icon: '/icon-hp.svg',
    accent: '#34d399',
    glow: 'rgba(52,211,153,0.35)',
    hoverBg: 'rgba(52,211,153,0.18)',
    bottomGlow: 'rgba(52,211,153,0.7)',
  },
  {
    id: 'rugby',
    label: 'RUGBY',
    lines: ['Teams · Attendance', 'Performance'],
    href: '/portal?sport=rugby',
    available: true,
    icon: '/icon-rugby.svg',
    accent: '#f87171',
    glow: 'rgba(248,113,113,0.35)',
    hoverBg: 'rgba(248,113,113,0.18)',
    bottomGlow: 'rgba(248,113,113,0.7)',
  },
  {
    id: 'cricket',
    label: 'CRICKET',
    lines: ['Coming soon'],
    href: '#',
    available: false,
    icon: '/icon-cricket.svg',
    accent: 'rgba(255,255,255,0.15)',
    glow: 'transparent',
    hoverBg: 'transparent',
    bottomGlow: 'transparent',
  },
];

export default function LandingPage() {
  const [activePhoto, setActivePhoto] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setActivePhoto(p => (p + 1) % PHOTOS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const fadeIn = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .anton { font-family: 'Anton', Impact, sans-serif; }

        /* ── LIQUID GLASS CARDS ── */
        .glass-card {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          cursor: pointer;
          transition:
            transform 0.35s cubic-bezier(0.34,1.56,0.64,1),
            box-shadow 0.35s ease,
            border-color 0.35s ease,
            background 0.35s ease;
        }

        /* Specular surface sheen — diagonal light catch */
        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background: linear-gradient(
            140deg,
            rgba(255,255,255,0.22) 0%,
            rgba(255,255,255,0.05) 35%,
            transparent 60%,
            rgba(255,255,255,0.04) 100%
          );
          pointer-events: none;
          z-index: 2;
          transition: opacity 0.35s ease;
        }

        /* Top rim — bright white edge light */
        .glass-card::after {
          content: '';
          position: absolute;
          top: 0; left: 12%; right: 12%;
          height: 1px;
          background: linear-gradient(90deg,
            transparent,
            rgba(255,255,255,0.9) 40%,
            rgba(255,255,255,1) 50%,
            rgba(255,255,255,0.9) 60%,
            transparent
          );
          pointer-events: none;
          z-index: 3;
        }

        /* Hover — lift + sport colour bleed */
        .glass-card:not(.locked):hover {
          transform: translateY(-8px) scale(1.025);
          background: var(--card-hover-bg) !important;
          border-color: var(--card-accent) !important;
          box-shadow:
            0 28px 70px rgba(0,0,0,0.55),
            0 0 0 1px var(--card-accent),
            0 0 40px var(--card-glow),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }

        /* Hover — icon glow */
        .glass-card:not(.locked):hover .glass-icon {
          filter: brightness(0) saturate(100%) invert(75%) sepia(50%) saturate(600%) hue-rotate(185deg) brightness(130%);
          drop-shadow: 0 0 16px var(--card-accent);
        }

        /* Hover — specular intensifies */
        .glass-card:not(.locked):hover::before {
          opacity: 1.4;
        }

        .glass-card.locked { cursor: default; }
        .glass-card.locked:hover { transform: none; }

        .glass-cta {
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), filter 0.25s ease;
        }
        .glass-card:not(.locked):hover .glass-cta {
          transform: scale(1.15);
          filter: brightness(1.2) saturate(1.2);
        }

        /* Bottom accent glow pulse on hover */
        .glass-glow {
          transition: opacity 0.35s ease, transform 0.35s ease;
          opacity: 0.25;
        }
        .glass-card:not(.locked):hover .glass-glow {
          opacity: 0.7;
          transform: translateX(-50%) scaleX(1.3);
        }
      `}</style>

      <main className="relative min-h-screen bg-[#040810] text-white overflow-hidden flex flex-col">

        {/* ── BACKGROUND PHOTOS ── */}
        <div className="absolute inset-0 hidden sm:grid grid-cols-4">
          {PHOTOS.map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{filter:'saturate(0.55) brightness(0.38)'}} priority={i===0}/>
              {i > 0 && <div className="absolute inset-y-0 left-0 w-px bg-white/5"/>}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 sm:hidden">
          {PHOTOS.map((src, i) => (
            <div key={i} className="absolute inset-0 transition-opacity duration-1000"
              style={{opacity: i === activePhoto ? 1 : 0}}>
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{filter:'saturate(0.55) brightness(0.38)'}} priority={i===0}/>
            </div>
          ))}
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 pointer-events-none"
          style={{background:'linear-gradient(to bottom, rgba(4,8,16,0.78) 0%, rgba(4,8,16,0.1) 35%, rgba(4,8,16,0.55) 100%)'}}/>
        <div className="absolute inset-0 pointer-events-none"
          style={{background:'radial-gradient(ellipse 50% 55% at 50% 38%, rgba(4,8,16,0.25), transparent)'}}/>

        {/* ── CONTENT ── */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-4 py-10 sm:py-12">

          {/* ── HERO ── */}
          <div className="flex flex-col items-center text-center">

            {/* Logo — RGBA transparent shield */}
            <div style={fadeIn(0)} className="mb-4">
              <Image
                src="/st-benedicts-logo.png"
                alt="St Benedict's College"
                width={80} height={80}
                className="h-16 w-16 sm:h-20 sm:w-20 object-contain"
                priority
                style={{filter:'drop-shadow(0 6px 20px rgba(0,0,0,0.7)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))'}}
              />
            </div>

            {/* School name */}
            <div style={fadeIn(80)} className="mb-1">
              <p style={{fontSize:13,fontWeight:400,letterSpacing:'0.2em',color:'rgba(255,255,255,0.88)'}}>
                ST BENEDICT&apos;S COLLEGE
              </p>
            </div>
            <div style={fadeIn(110)} className="mb-8">
              <p style={{fontSize:10,letterSpacing:'0.2em',color:'rgba(255,255,255,0.35)'}}>
                EST. 1958 &nbsp;·&nbsp; BEDFORDVIEW
              </p>
            </div>

            {/* Headline */}
            <div style={fadeIn(180)} className="mb-3">
              <h1 className="anton leading-none text-center">
                <span className="block text-white"
                  style={{fontSize:'clamp(3rem,9vw,6.5rem)',letterSpacing:'0.04em'}}>
                  DRIVEN BY
                </span>
                <span className="block" style={{
                  fontSize:'clamp(3rem,9vw,6.5rem)',
                  letterSpacing:'0.04em',
                  fontStyle:'italic',
                  color:'#38bdf8',
                  textShadow:'0 0 50px rgba(56,189,248,0.4), 0 0 100px rgba(56,189,248,0.2)',
                }}>
                  EXCELLENCE
                </span>
              </h1>
            </div>

            {/* Divider */}
            <div style={{
              ...fadeIn(260),
              width:56, height:2,
              background:'linear-gradient(90deg,transparent,rgba(56,189,248,0.7),transparent)',
              marginBottom:18,
            }}/>

            {/* Tagline */}
            <p style={{
              ...fadeIn(310),
              fontSize:14,
              fontWeight:400,
              color:'rgba(255,255,255,0.5)',
              lineHeight:1.75,
              maxWidth:380,
              letterSpacing:'0.01em',
            }}>
              A unified performance platform for athletes,<br/>coaches and teams.
            </p>
          </div>

          {/* ── LIQUID GLASS CARDS ── */}
          <div style={{...fadeIn(420), width:'100%', maxWidth:880}} className="mt-10 sm:mt-12">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mx-auto">
              {DEPARTMENTS.map((dept) => {

                const cardContent = (
                  <div
                    className={`glass-card${dept.available ? '' : ' locked'} flex flex-col items-center text-center`}
                    style={{
                      '--card-accent': dept.accent,
                      '--card-glow': dept.glow,
                      '--card-hover-bg': dept.hoverBg,
                      background: 'rgba(8,16,40,0.35)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.08)',
                      padding: '28px 18px 22px',
                      minHeight: 215,
                    } as React.CSSProperties}
                  >
                    {/* Bottom sport colour glow */}
                    {dept.available && (
                      <div className="glass-glow" style={{
                        position:'absolute',
                        bottom:-8, left:'50%',
                        transform:'translateX(-50%)',
                        width:'65%', height:50,
                        background: dept.bottomGlow,
                        filter:'blur(24px)',
                        borderRadius:'50%',
                        pointerEvents:'none',
                        zIndex:0,
                      }}/>
                    )}

                    {/* Icon */}
                    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,position:'relative',zIndex:1}}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dept.icon}
                        alt={dept.label}
                        className="glass-icon"
                        style={{
                          width:58, height:58,
                          objectFit:'contain',
                          opacity: dept.available ? 1 : 0.18,
                          filter: dept.available
                            ? 'brightness(0) saturate(100%) invert(75%) sepia(50%) saturate(500%) hue-rotate(185deg) brightness(115%)'
                            : 'grayscale(1) brightness(0.5)',
                          transition:'filter 0.35s ease',
                        }}
                      />
                    </div>

                    {/* Label */}
                    <p style={{
                      fontSize:14,fontWeight:800,
                      letterSpacing:'0.1em',
                      color: dept.available ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.22)',
                      marginBottom:6,
                      position:'relative',zIndex:1,
                    }}>
                      {dept.label}
                    </p>

                    {/* Sub-text */}
                    <div style={{marginBottom:18,minHeight:34,position:'relative',zIndex:1}}>
                      {dept.lines.map((line, i) => (
                        <p key={i} style={{
                          fontSize:10.5,
                          color:'rgba(255,255,255,0.35)',
                          lineHeight:1.65,
                          letterSpacing:'0.02em',
                        }}>{line}</p>
                      ))}
                    </div>

                    {/* CTA */}
                    <div style={{position:'relative',zIndex:1}}>
                      {dept.available ? (
                        <div className="glass-cta" style={{
                          width:38, height:38, borderRadius:'50%',
                          background: 'rgba(255,255,255,0.12)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.2)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}
                            style={{width:15,height:15}}>
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </div>
                      ) : (
                        <div style={{
                          width:38, height:38,
                          borderRadius:'50%',
                          background:'rgba(255,255,255,0.05)',
                          border:'1px solid rgba(255,255,255,0.1)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2}
                            style={{width:15,height:15}}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );

                return dept.available ? (
                  <Link key={dept.id} href={dept.href} style={{display:'block'}}
                    onClick={() => {
                      if (dept.id !== 'hp') document.cookie = `portal_sport=${dept.id};path=/;max-age=86400`;
                    }}>
                    {cardContent}
                  </Link>
                ) : (
                  <div key={dept.id}>{cardContent}</div>
                );
              })}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={fadeIn(620)} className="mt-10 flex flex-col items-center gap-2">
            <p style={{
              fontSize:9, fontWeight:700,
              letterSpacing:'0.45em',
              color:'rgba(56,189,248,0.4)',
              textTransform:'uppercase',
            }}>
              Veritas In Caritate
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-2"
              style={{fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:'0.03em'}}>
              <span>KINETIQ Sport is a product of Altus (Pty) Ltd. Reg. 2026/424230/07</span>
              <span>·</span>
              <Link href="/privacy" style={{color:'inherit'}}
                className="hover:text-white/40 transition-colors">Privacy</Link>
              <span>·</span>
              <Link href="/terms" style={{color:'inherit'}}
                className="hover:text-white/40 transition-colors">Terms</Link>
              <span>·</span>
              <span>© {new Date().getFullYear()} All rights reserved.</span>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
