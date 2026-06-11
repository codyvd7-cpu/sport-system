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
    accent: 'rgba(56,189,248,0.6)',
  },
  {
    id: 'hp',
    label: 'HP CLASSES',
    lines: ['Testing · Trends', 'Athletes'],
    href: '/hp-login',
    available: true,
    icon: '/icon-hp.svg',
    accent: 'rgba(52,211,153,0.6)',
  },
  {
    id: 'rugby',
    label: 'RUGBY',
    lines: ['Teams · Attendance', 'Performance'],
    href: '/portal?sport=rugby',
    available: true,
    icon: '/icon-rugby.svg',
    accent: 'rgba(248,113,113,0.6)',
  },
  {
    id: 'cricket',
    label: 'CRICKET',
    lines: ['Coming soon'],
    href: '#',
    available: false,
    icon: '/icon-cricket.svg',
    accent: 'rgba(255,255,255,0.15)',
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

        /* Liquid glass card */
        .glass-card {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.3s ease;
          cursor: pointer;
        }
        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 22px;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.18) 0%,
            rgba(255,255,255,0.04) 40%,
            rgba(255,255,255,0.08) 100%
          );
          pointer-events: none;
          z-index: 1;
        }
        .glass-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.5) 30%,
            rgba(255,255,255,0.7) 50%,
            rgba(255,255,255,0.5) 70%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 2;
        }
        .glass-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15);
        }
        .glass-card.locked {
          cursor: default;
        }
        .glass-card.locked:hover {
          transform: none;
          box-shadow: none;
        }
        .glass-cta {
          transition: transform 0.25s ease, filter 0.25s ease;
        }
        .glass-card:not(.locked):hover .glass-cta {
          transform: scale(1.12);
          filter: brightness(1.15);
        }
      `}</style>

      <main className="relative min-h-screen bg-[#040810] text-white overflow-hidden flex flex-col">

        {/* ── BACKGROUND PHOTOS ── */}
        <div className="absolute inset-0 hidden sm:grid grid-cols-4">
          {PHOTOS.map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{filter:'saturate(0.4) brightness(0.28)'}} priority={i===0}/>
              {i > 0 && <div className="absolute inset-y-0 left-0 w-px bg-white/5"/>}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 sm:hidden">
          {PHOTOS.map((src, i) => (
            <div key={i} className="absolute inset-0 transition-opacity duration-1000"
              style={{opacity: i === activePhoto ? 1 : 0}}>
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{filter:'saturate(0.4) brightness(0.28)'}} priority={i===0}/>
            </div>
          ))}
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 pointer-events-none"
          style={{background:'linear-gradient(to bottom, rgba(4,8,16,0.75) 0%, rgba(4,8,16,0.15) 40%, rgba(4,8,16,0.85) 100%)'}}/>
        <div className="absolute inset-0 pointer-events-none"
          style={{background:'radial-gradient(ellipse 55% 65% at 50% 42%, rgba(4,8,16,0.3), transparent)'}}/>

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
                      background: dept.available
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(255,255,255,0.03)',
                      backdropFilter: 'blur(28px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: dept.available
                        ? `0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 0.5px rgba(255,255,255,0.06)`
                        : '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
                      padding: '26px 18px 20px',
                      minHeight: 210,
                    }}
                  >
                    {/* Accent glow at bottom */}
                    {dept.available && (
                      <div style={{
                        position:'absolute',
                        bottom:0, left:'50%',
                        transform:'translateX(-50%)',
                        width:'70%', height:40,
                        background:dept.accent,
                        filter:'blur(20px)',
                        borderRadius:'50%',
                        opacity:0.35,
                        pointerEvents:'none',
                        zIndex:0,
                      }}/>
                    )}

                    {/* Icon */}
                    <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, position:'relative', zIndex:1}}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dept.icon}
                        alt={dept.label}
                        style={{
                          width:60, height:60,
                          objectFit:'contain',
                          opacity: dept.available ? 1 : 0.2,
                          filter: dept.available
                            ? 'brightness(0) saturate(100%) invert(75%) sepia(50%) saturate(500%) hue-rotate(185deg) brightness(115%)'
                            : 'grayscale(1) brightness(0.6)',
                          dropShadow: dept.available ? `0 4px 16px ${dept.accent}` : 'none',
                        }}
                      />
                    </div>

                    {/* Label */}
                    <p style={{
                      fontSize:14,
                      fontWeight:800,
                      letterSpacing:'0.1em',
                      color: dept.available ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)',
                      marginBottom:6,
                      position:'relative', zIndex:1,
                    }}>
                      {dept.label}
                    </p>

                    {/* Sub-text */}
                    <div style={{marginBottom:18, minHeight:34, position:'relative', zIndex:1}}>
                      {dept.lines.map((line, i) => (
                        <p key={i} style={{
                          fontSize:10.5,
                          color:'rgba(255,255,255,0.38)',
                          lineHeight:1.65,
                          letterSpacing:'0.02em',
                        }}>
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* CTA */}
                    <div style={{position:'relative', zIndex:1}}>
                      {dept.available ? (
                        <div className="glass-cta flex items-center justify-center rounded-full"
                          style={{
                            width:38, height:38,
                            background:'linear-gradient(135deg,#38bdf8,#0ea5e9)',
                            boxShadow:'0 4px 16px rgba(56,189,248,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
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
