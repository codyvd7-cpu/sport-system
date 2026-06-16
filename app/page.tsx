'use client';

import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';



const PHOTOS = ['/sbc-photo-4.jpg', '/sbc-photo-1.jpg', '/sbc-photo-3.jpg', '/sbc-photo-2.jpg'];

const DEPARTMENTS = [
  {
    id: 'hockey',
    label: 'HOCKEY',
    lines: ['Teams · Fixtures · Results', 'Weekly Schedule'],
    href: '/portal-login?sport=hockey',
    available: true,
    icon: '/icon-hockey.svg',
    accent: '#38bdf8',
    glow: 'rgba(56,189,248,0.35)',
    hoverBg: 'rgba(56,189,248,0.15)',
    bottomGlow: 'rgba(56,189,248,0.7)',
  },
  {
    id: 'hp',
    label: 'HP CLASSES',
    lines: ['Testing · Trends', 'Athletes & Attendance'],
    href: '/hp-login',
    available: true,
    icon: '/icon-hp.svg',
    accent: '#34d399',
    glow: 'rgba(52,211,153,0.35)',
    hoverBg: 'rgba(52,211,153,0.15)',
    bottomGlow: 'rgba(52,211,153,0.7)',
  },
  {
    id: 'rugby',
    label: 'RUGBY',
    lines: ['Teams · Fixtures · Results', 'Weekly Schedule'],
    href: '/portal-login?sport=rugby',
    available: true,
    icon: '/icon-rugby.svg',
    accent: '#f87171',
    glow: 'rgba(248,113,113,0.35)',
    hoverBg: 'rgba(248,113,113,0.15)',
    bottomGlow: 'rgba(248,113,113,0.7)',
  },
  {
    id: 'cricket',
    label: 'CRICKET',
    lines: ['Coming Soon'],
    href: '#',
    available: false,
    icon: '/icon-cricket.svg',
    accent: 'rgba(255,255,255,0.15)',
    glow: 'transparent',
    hoverBg: 'transparent',
    bottomGlow: 'transparent',
  },
  {
    id: 'swimming',
    label: 'SWIMMING',
    lines: ['Coming Soon'],
    href: '#',
    available: false,
    icon: '/icon-swimming.svg',
    accent: 'rgba(255,255,255,0.15)',
    glow: 'transparent',
    hoverBg: 'transparent',
    bottomGlow: 'transparent',
  },
  {
    id: 'rowing',
    label: 'ROWING',
    lines: ['Coming Soon'],
    href: '#',
    available: false,
    icon: '/icon-rowing.svg',
    accent: 'rgba(255,255,255,0.15)',
    glow: 'transparent',
    hoverBg: 'transparent',
    bottomGlow: 'transparent',
  },
  {
    id: 'athletics',
    label: 'ATHLETICS',
    lines: ['Coming Soon'],
    href: '#',
    available: false,
    icon: '/icon-athletics.png',
    accent: 'rgba(255,255,255,0.15)',
    glow: 'transparent',
    hoverBg: 'transparent',
    bottomGlow: 'transparent',
  },
  {
    id: 'waterpolo',
    label: 'WATER POLO',
    lines: ['Coming Soon'],
    href: '#',
    available: false,
    icon: '/icon-waterpolo.svg',
    accent: 'rgba(255,255,255,0.15)',
    glow: 'transparent',
    hoverBg: 'transparent',
    bottomGlow: 'transparent',
  },
  {
    id: 'soccer',
    label: 'SOCCER',
    lines: ['Coming Soon'],
    href: '#',
    available: false,
    icon: '/icon-soccer.svg',
    accent: 'rgba(255,255,255,0.15)',
    glow: 'transparent',
    hoverBg: 'transparent',
    bottomGlow: 'transparent',
  },
  {
    id: 'golf',
    label: 'GOLF',
    lines: ['Coming Soon'],
    href: '#',
    available: false,
    icon: '/icon-golf.svg',
    accent: 'rgba(255,255,255,0.15)',
    glow: 'transparent',
    hoverBg: 'transparent',
    bottomGlow: 'transparent',
  },
];


// Sport icons as clean JSX — no file loading, no filter tricks
function SportIcon({ id, available }: { id: string; available: boolean }) {
  const W = { stroke: 'white', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const F = { fill: 'white' };
  const style = { width: 50, height: 50, opacity: available ? 1 : 0.4, flexShrink: 0 as const };
  const activeFilter = 'brightness(0) saturate(100%) invert(75%) sepia(50%) saturate(500%) hue-rotate(185deg) brightness(115%)';

  // Available sports use existing white img files with blue filter
  if (available) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/icon-${id}.svg`} alt={id} className="glass-icon"
        style={{ ...style, objectFit: 'contain', filter: activeFilter }} />
    );
  }

  // Locked sports — simple clean white SVG icons
  const icons: Record<string, React.ReactElement> = {
    cricket: (
      <svg viewBox="0 0 48 48" style={style}>
        <rect x="20" y="4" width="8" height="28" rx="2" {...F} opacity="0.9"/>
        <ellipse cx="24" cy="38" rx="10" ry="6" {...F} opacity="0.9"/>
        <rect x="22" y="30" width="4" height="10" {...F}/>
      </svg>
    ),
    swimming: (
      <svg viewBox="0 0 48 48" style={style}>
        <circle cx="38" cy="10" r="5" {...F}/>
        <path d="M6 20 C12 14 18 13 24 18 L36 26" {...W} strokeWidth="4"/>
        <path d="M4 30 C10 24 18 24 24 28 C30 32 38 32 44 28" {...W} strokeWidth="3.5"/>
        <path d="M4 38 C10 32 18 32 24 36 C30 40 38 40 44 36" {...W} strokeWidth="3.5"/>
      </svg>
    ),
    rowing: (
      <svg viewBox="0 0 48 48" style={style}>
        <line x1="6" y1="42" x2="38" y2="10" {...W} strokeWidth="4"/>
        <ellipse cx="41" cy="7" rx="5" ry="3" transform="rotate(-40 41 7)" {...F}/>
        <line x1="42" y1="42" x2="10" y2="10" {...W} strokeWidth="4"/>
        <ellipse cx="7" cy="7" rx="5" ry="3" transform="rotate(40 7 7)" {...F}/>
        <path d="M4 40 C12 34 22 34 28 38 C34 42 40 42 44 40" {...W} strokeWidth="3"/>
      </svg>
    ),
    athletics: (
      <svg viewBox="0 0 48 48" style={style}>
        <circle cx="34" cy="7" r="5" {...F}/>
        <path d="M34 12 L26 26 L14 20" {...W} strokeWidth="3.5"/>
        <path d="M26 26 L20 40 L10 46" {...W} strokeWidth="3.5"/>
        <path d="M26 26 L32 40 L42 44" {...W} strokeWidth="3.5"/>
        <path d="M34 12 L44 9" {...W} strokeWidth="3.5"/>
      </svg>
    ),
    waterpolo: (
      <svg viewBox="0 0 48 48" style={style}>
        <circle cx="30" cy="18" r="12" {...W} strokeWidth="2.5"/>
        <path d="M30 6 L30 30" {...W} strokeWidth="1.5"/>
        <path d="M18 18 L42 18" {...W} strokeWidth="1.5"/>
        <path d="M21 9 L39 27" {...W} strokeWidth="1.5"/>
        <path d="M39 9 L21 27" {...W} strokeWidth="1.5"/>
        <circle cx="14" cy="22" r="4" {...F}/>
        <path d="M14 26 L10 36" {...W} strokeWidth="3"/>
        <path d="M8 30 L20 28" {...W} strokeWidth="3"/>
        <path d="M10 36 L6 44" {...W} strokeWidth="3"/>
        <path d="M10 36 L16 44" {...W} strokeWidth="3"/>
      </svg>
    ),
    soccer: (
      <svg viewBox="0 0 48 48" style={style}>
        <circle cx="24" cy="24" r="19" {...W} strokeWidth="2.5"/>
        <polygon points="24,12 20,19 27,19" {...F}/>
        <polygon points="10,20 15,22 13,29" {...F}/>
        <polygon points="38,20 33,22 35,29" {...F}/>
        <polygon points="14,35 18,29 22,33" {...F}/>
        <polygon points="34,35 30,29 26,33" {...F}/>
        <line x1="24" y1="12" x2="20" y2="19" {...W} strokeWidth="1.5"/>
        <line x1="24" y1="12" x2="27" y2="19" {...W} strokeWidth="1.5"/>
        <line x1="20" y1="19" x2="13" y2="22" {...W} strokeWidth="1.5"/>
        <line x1="27" y1="19" x2="35" y2="22" {...W} strokeWidth="1.5"/>
      </svg>
    ),
    golf: (
      <svg viewBox="0 0 48 48" style={style}>
        <line x1="24" y1="6" x2="24" y2="40" {...W} strokeWidth="3"/>
        <path d="M24 6 L36 14 L24 22" {...F}/>
        <circle cx="24" cy="44" r="4" {...F}/>
        <line x1="6" y1="40" x2="42" y2="40" {...W} strokeWidth="2.5"/>
      </svg>
    ),
  };

  return icons[id] || (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/icon-${id}.svg`} alt={id} style={{ ...style, objectFit: 'contain' }}/>
  );
}

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

        .glass-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition:
            transform 0.35s cubic-bezier(0.34,1.56,0.64,1),
            box-shadow 0.35s ease,
            border-color 0.35s ease,
            background 0.35s ease;
        }
        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: linear-gradient(140deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0.04) 35%,transparent 60%,rgba(255,255,255,0.03) 100%);
          pointer-events: none;
          z-index: 2;
        }
        .glass-card::after {
          content: '';
          position: absolute;
          top: 0; left: 12%; right: 12%;
          height: 1px;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,0.85) 40%,rgba(255,255,255,1) 50%,rgba(255,255,255,0.85) 60%,transparent);
          pointer-events: none;
          z-index: 3;
        }
        .glass-card:not(.locked):hover {
          transform: translateY(-6px) scale(1.02);
          background: var(--card-hover-bg) !important;
          border-color: var(--card-accent) !important;
          box-shadow: 0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px var(--card-accent), 0 0 36px var(--card-glow), inset 0 1px 0 rgba(255,255,255,0.18);
        }
        .glass-card.locked { cursor: default; opacity: 0.55; }
        .glass-card.locked:hover { transform: none; }
        .glass-cta { transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), filter 0.25s ease; }
        .glass-card:not(.locked):hover .glass-cta { transform: scale(1.15); filter: brightness(1.2); }
        .glass-glow { transition: opacity 0.35s ease, transform 0.35s ease; opacity: 0.2; }
        .glass-card:not(.locked):hover .glass-glow { opacity: 0.65; transform: translateX(-50%) scaleX(1.3); }
        .glass-icon { transition: filter 0.35s ease; }
      `}</style>

      <main className="relative min-h-screen bg-[#040810] text-white overflow-hidden flex flex-col">

        {/* ── BACKGROUND PHOTOS ── */}
        <div className="absolute inset-0 hidden sm:grid grid-cols-4">
          {PHOTOS.map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{ filter: 'saturate(0.55) brightness(0.35)' }} priority={i === 0} />
              {i > 0 && <div className="absolute inset-y-0 left-0 w-px bg-white/5" />}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 sm:hidden">
          {PHOTOS.map((src, i) => (
            <div key={i} className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: i === activePhoto ? 1 : 0 }}>
              <Image src={src} alt="" fill className="object-cover object-center"
                style={{ filter: 'saturate(0.55) brightness(0.35)' }} priority={i === 0} />
            </div>
          ))}
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(4,8,16,0.82) 0%, rgba(4,8,16,0.08) 40%, rgba(4,8,16,0.65) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 55% at 50% 38%, rgba(4,8,16,0.2), transparent)' }} />

        {/* ── CONTENT ── */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-4 py-8 sm:py-10">

          {/* ── HERO ── */}
          <div className="flex flex-col items-center text-center">
            <div style={fadeIn(0)} className="mb-4">
              <Image src="/st-benedicts-logo.png" alt="St Benedict's College"
                width={80} height={80} className="h-16 w-16 sm:h-20 sm:w-20 object-contain" priority
                style={{ filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.7)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />
            </div>
            <div style={fadeIn(80)} className="mb-1">
              <p style={{ fontSize: 13, fontWeight: 400, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.88)' }}>
                ST BENEDICT&apos;S COLLEGE
              </p>
            </div>
            <div style={fadeIn(110)} className="mb-7">
              <p style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)' }}>
                EST. 1958 &nbsp;·&nbsp; BEDFORDVIEW
              </p>
            </div>
            <div style={fadeIn(180)} className="mb-3">
              <h1 className="anton leading-none text-center">
                <span className="block text-white" style={{ fontSize: 'clamp(2.8rem,8vw,6rem)', letterSpacing: '0.04em' }}>
                  DRIVEN BY
                </span>
                <span className="block" style={{
                  fontSize: 'clamp(2.8rem,8vw,6rem)',
                  letterSpacing: '0.04em',
                  fontStyle: 'italic',
                  color: '#38bdf8',
                  textShadow: '0 0 50px rgba(56,189,248,0.4), 0 0 100px rgba(56,189,248,0.2)',
                }}>
                  EXCELLENCE
                </span>
              </h1>
            </div>
            <div style={{ ...fadeIn(260), width: 56, height: 2, background: 'linear-gradient(90deg,transparent,rgba(56,189,248,0.7),transparent)', marginBottom: 16 }} />
            <p style={{ ...fadeIn(310), fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, maxWidth: 380, letterSpacing: '0.01em' }}>
              A unified performance platform for athletes,<br />coaches and teams.
            </p>
          </div>

          {/* ── SPORTS GRID ── */}
          <div style={{ ...fadeIn(400), width: '100%', maxWidth: 960 }} className="mt-8 sm:mt-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mx-auto">
              {DEPARTMENTS.map((dept) => {
                const card = (
                  <div
                    className={`glass-card${dept.available ? '' : ' locked'} flex flex-col items-center text-center`}
                    style={{
                      '--card-accent': dept.accent,
                      '--card-glow': dept.glow,
                      '--card-hover-bg': dept.hoverBg,
                      background: 'rgba(8,16,40,0.38)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.11)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.14)',
                      padding: '22px 16px 18px',
                      minHeight: 190,
                    } as React.CSSProperties}
                  >
                    {/* Bottom glow */}
                    {dept.available && (
                      <div className="glass-glow" style={{
                        position: 'absolute', bottom: -8, left: '50%',
                        transform: 'translateX(-50%)',
                        width: '65%', height: 44,
                        background: dept.bottomGlow,
                        filter: 'blur(22px)',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                        zIndex: 0,
                      }} />
                    )}

                    {/* Icon */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative', zIndex: 1 }}>
                      <SportIcon id={dept.id} available={dept.available} />
                    </div>

                    {/* Label */}
                    <p style={{
                      fontSize: 12, fontWeight: 800, letterSpacing: '0.1em',
                      color: dept.available ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)',
                      marginBottom: 5, position: 'relative', zIndex: 1,
                    }}>
                      {dept.label}
                    </p>

                    {/* Sub-text */}
                    <div style={{ marginBottom: 14, minHeight: 28, position: 'relative', zIndex: 1 }}>
                      {dept.lines.map((line, i) => (
                        <p key={i} style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.32)', lineHeight: 1.6, letterSpacing: '0.02em' }}>
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* CTA */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {dept.available ? (
                        <div className="glass-cta" style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.1)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 8px rgba(0,0,0,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{ width: 13, height: 13 }}>
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </div>
                      ) : (
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} style={{ width: 13, height: 13 }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );

                return dept.available ? (
                  <Link key={dept.id} href={dept.href} style={{ display: 'block' }}
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
          <div style={fadeIn(580)} className="mt-8 flex flex-col items-center gap-2">
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.45em', color: 'rgba(56,189,248,0.4)', textTransform: 'uppercase' }}>
              Veritas In Caritate
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-2"
              style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.03em' }}>
              <span>KINETIQ Sport is a product of Altus (Pty) Ltd. Reg. 2026/424230/07</span>
              <span>·</span>
              <Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
              <span>·</span>
              <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link>
              <span>·</span>
              <span>© {new Date().getFullYear()} All rights reserved.</span>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}