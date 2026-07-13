'use client';
import * as React from 'react';
import Link from 'next/link';
import { SPORTS, type SportKey, getSportColor } from '@/lib/sports';

type Row = Record<string, any>;

function fDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' });
}
function fTime(t?: string) {
  if (!t) return '';
  const [h,m] = t.split(':'); const hr = parseInt(h);
  return `${hr>12?hr-12:hr}:${m}${hr>=12?'pm':'am'}`;
}

interface Props { sport: SportKey; nextFixture: Row|null; }

export default function PortalHero({ sport, nextFixture }: Props) {
  const cfg   = SPORTS[sport];
  const color = getSportColor(sport);
  const fixTerm = cfg?.terminology?.fixture ?? 'Fixture';
  const heroImg = cfg?.portal?.heroImage;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  const fadeUp = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(16px)',
    transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section style={{ position:'relative', overflow:'hidden', minHeight:'clamp(560px, 88vh, 780px)', display:'flex', alignItems:'flex-end' }}>

      {/* ── Full-bleed cinematic image ── */}
      {heroImg && (
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImg} alt="" style={{
            width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 18%',
            transform: mounted ? 'scale(1.0)' : 'scale(1.06)',
            transition:'transform 1.6s cubic-bezier(0.16,1,0.3,1)',
          }}/>
          {/* Layered depth gradients */}
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(180deg, rgba(3,8,16,0.35) 0%, rgba(3,8,16,0.55) 35%, #030810 92%)` }}/>
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg, rgba(3,8,16,0.96) 0%, rgba(3,8,16,0.55) 42%, rgba(3,8,16,0.15) 75%, rgba(3,8,16,0.5) 100%)` }}/>
          <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 800px 500px at 15% 100%, ${color}25 0%, transparent 60%)` }}/>
        </div>
      )}

      <div style={{ position:'relative', zIndex:1, padding:'120px 24px 64px', maxWidth:1240, margin:'0 auto', width:'100%' }}>
        <div style={{ display:'grid', gap:48, alignItems:'flex-end' }} className="lg:grid-cols-[1fr_400px]">

          {/* Left — headline */}
          <div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:9, padding:'7px 16px 7px 11px',
              borderRadius:100, background:'rgba(255,255,255,0.08)', border:`1px solid ${color}55`,
              backdropFilter:'blur(12px)', marginBottom:24, ...fadeUp(0),
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:color, boxShadow:`0 0 12px ${color}` }}/>
              <span style={{ fontSize:11, fontWeight:800, color:'white', textTransform:'uppercase', letterSpacing:'0.22em' }}>Live Sport Portal</span>
            </div>

            <h1 style={{
              fontSize:'clamp(38px,6.5vw,76px)', fontWeight:900, letterSpacing:'-0.035em',
              lineHeight:0.96, color:'white', marginBottom:20,
              textShadow:'0 8px 50px rgba(0,0,0,0.6)', ...fadeUp(0.08),
            }}>
              {cfg?.portal?.headline ?? `ST BENEDICT'S ${(cfg?.label ?? sport).toUpperCase()}`}
            </h1>

            <p style={{ fontSize:'clamp(18px,2.6vw,26px)', fontWeight:800, color, marginBottom:18, ...fadeUp(0.16) }}>
              This Week at a Glance
            </p>

            <p style={{
              fontSize:'clamp(14px,1.6vw,16.5px)', color:'rgba(255,255,255,0.6)', lineHeight:1.7,
              maxWidth:490, marginBottom:36, ...fadeUp(0.22),
            }}>
              {cfg?.portal?.description ?? 'Fixtures, training updates, programmes and department notices — all in one place.'}
            </p>

            <div style={{ display:'flex', gap:14, flexWrap:'wrap', ...fadeUp(0.3) }}>
              <a href="#this-week" style={{
                fontSize:14.5, fontWeight:800, padding:'15px 30px', borderRadius:13,
                background:color, color:'#030810', textDecoration:'none',
                boxShadow:`0 12px 32px ${color}50`, transition:'all .2s cubic-bezier(0.16,1,0.3,1)',
                display:'inline-flex', alignItems:'center', gap:8,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 16px 40px ${color}70`; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=`0 12px 32px ${color}50`; }}>
                View This Week
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{width:15,height:15}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <Link href="/player/auth" style={{
                fontSize:14.5, fontWeight:700, padding:'15px 30px', borderRadius:13,
                background:'rgba(255,255,255,0.09)', color:'white',
                border:'1px solid rgba(255,255,255,0.18)', textDecoration:'none',
                backdropFilter:'blur(12px)', transition:'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.16)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.09)'; }}>
                Player Login
              </Link>
            </div>
          </div>

          {/* Right — Next Fixture: hero-grade card */}
          <div style={fadeUp(0.35)}>
            {nextFixture ? (
              <Link href={`/portal/fixtures?sport=${sport}`} style={{
                position:'relative', borderRadius:26, overflow:'hidden', display:'block',
                background: `linear-gradient(155deg, ${color} 0%, ${color}cc 45%, #0a1120 100%)`,
                boxShadow: `0 28px 70px -14px ${color}70, 0 0 0 1px ${color}55`,
                textDecoration:'none', transition:'all .3s cubic-bezier(0.16,1,0.3,1)',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-6px) scale(1.015)'; e.currentTarget.style.boxShadow=`0 36px 90px -14px ${color}90, 0 0 0 1px ${color}80`; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0) scale(1)'; e.currentTarget.style.boxShadow=`0 28px 70px -14px ${color}70, 0 0 0 1px ${color}55`; }}>

                {/* Shine sweep */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'55%', background:'linear-gradient(180deg, rgba(255,255,255,0.22), transparent)', pointerEvents:'none' }}/>
                {/* Corner glow */}
                <div style={{ position:'absolute', bottom:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.15)', filter:'blur(40px)', pointerEvents:'none' }}/>

                <div style={{ position:'relative', padding:'28px 28px 30px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:'#030810' }}/>
                      <p style={{ fontSize:11.5, fontWeight:900, color:'#030810', textTransform:'uppercase', letterSpacing:'0.25em' }}>
                        Next {fixTerm}
                      </p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#030810" strokeWidth={2.5} style={{width:16,height:16, opacity:0.6}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>

                  {nextFixture.team && (
                    <div style={{ display:'inline-block', padding:'5px 13px', borderRadius:9, background:'rgba(3,8,16,0.28)', marginBottom:12 }}>
                      <span style={{ fontSize:13.5, fontWeight:900, color:'#030810' }}>{nextFixture.team}</span>
                    </div>
                  )}

                  <p style={{ fontSize:32, fontWeight:900, color:'#030810', marginBottom:22, lineHeight:1.05, letterSpacing:'-0.02em' }}>
                    vs {nextFixture.opponent}
                  </p>

                  <div style={{ background:'rgba(3,8,16,0.88)', borderRadius:18, padding:'20px 22px', display:'flex', flexDirection:'column', gap:12 }}>
                    {[
                      { icon:'📅', val:fDate(nextFixture.fixture_date) },
                      ...(nextFixture.fixture_time ? [{ icon:'🕐', val:fTime(nextFixture.fixture_time) }] : []),
                      ...(nextFixture.venue        ? [{ icon:'📍', val:nextFixture.venue }] : []),
                      ...(nextFixture.home_away    ? [{ icon:'🏟️', val:nextFixture.home_away }] : []),
                    ].map((row,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:11 }}>
                        <span style={{ fontSize:15 }}>{row.icon}</span>
                        <span style={{ fontSize:14.5, fontWeight:700, color:'white' }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{ borderRadius:26, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', backdropFilter:'blur(16px)', padding:44, display:'flex', alignItems:'center', justifyContent:'center', minHeight:240 }}>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.3)', fontWeight:700 }}>No upcoming fixtures</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
