'use client';
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

  return (
    <section style={{ position:'relative', overflow:'hidden' }}>

      {/* ── Full-width background image with strong gradient ── */}
      {heroImg && (
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.55 }}/>
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(180deg, rgba(3,8,16,0.55) 0%, rgba(3,8,16,0.85) 55%, #030810 100%)` }}/>
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(100deg, rgba(3,8,16,0.92) 0%, rgba(3,8,16,0.5) 50%, rgba(3,8,16,0.75) 100%)` }}/>
        </div>
      )}

      {/* Colour wash */}
      <div style={{ position:'absolute', top:-140, left:'50%', transform:'translateX(-50%)', width:900, height:500, borderRadius:'50%', background:`radial-gradient(ellipse, ${color}22 0%, transparent 70%)`, filter:'blur(10px)', pointerEvents:'none', zIndex:0 }}/>

      <div style={{ position:'relative', zIndex:1, padding:'64px 24px 56px', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gap:44, alignItems:'end' }} className="lg:grid-cols-[1fr_380px]">

          {/* Left — headline */}
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px 6px 10px', borderRadius:100, background:`${color}22`, border:`1px solid ${color}55`, marginBottom:20 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:color, boxShadow:`0 0 10px ${color}` }}/>
              <span style={{ fontSize:11, fontWeight:800, color:'white', textTransform:'uppercase', letterSpacing:'0.2em' }}>Live Sport Portal</span>
            </div>

            <h1 style={{ fontSize:'clamp(34px,6vw,64px)', fontWeight:900, letterSpacing:'-0.03em', lineHeight:0.98, color:'white', marginBottom:18, textShadow:'0 4px 40px rgba(0,0,0,0.5)' }}>
              {cfg?.portal?.headline ?? `ST BENEDICT'S ${(cfg?.label ?? sport).toUpperCase()}`}
            </h1>

            <p style={{ fontSize:'clamp(17px,2.4vw,24px)', fontWeight:800, color, marginBottom:16 }}>
              This Week at a Glance
            </p>

            <p style={{ fontSize:'clamp(14px,1.6vw,16px)', color:'rgba(255,255,255,0.55)', lineHeight:1.7, maxWidth:480, marginBottom:32 }}>
              {cfg?.portal?.description ?? 'Fixtures, training updates, programmes and department notices — all in one place.'}
            </p>

            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              <a href="#this-week" style={{
                fontSize:14, fontWeight:800, padding:'14px 28px', borderRadius:12,
                background:color, color:'#030810', textDecoration:'none',
                boxShadow:`0 10px 30px ${color}45`, transition:'transform .15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}>
                View This Week
              </a>
              <Link href="/player/auth" style={{
                fontSize:14, fontWeight:700, padding:'14px 28px', borderRadius:12,
                background:'rgba(255,255,255,0.1)', color:'white',
                border:'1px solid rgba(255,255,255,0.2)', textDecoration:'none',
                backdropFilter:'blur(8px)', transition:'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}>
                Player Login
              </Link>
            </div>
          </div>

          {/* Right — Next Fixture: bold, unmissable card */}
          {nextFixture ? (
            <div style={{
              position:'relative', borderRadius:24, overflow:'hidden',
              background: `linear-gradient(160deg, ${color} 0%, ${color}dd 40%, #0a1120 100%)`,
              boxShadow: `0 24px 60px -12px ${color}66, 0 0 0 1px ${color}66`,
            }}>
              {/* Shine overlay */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'50%', background:'linear-gradient(180deg, rgba(255,255,255,0.18), transparent)', pointerEvents:'none' }}/>

              <div style={{ position:'relative', padding:'26px 26px 28px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:'#030810' }}/>
                  <p style={{ fontSize:11, fontWeight:900, color:'#030810', textTransform:'uppercase', letterSpacing:'0.25em' }}>
                    Next {fixTerm}
                  </p>
                </div>

                {nextFixture.team && (
                  <div style={{ display:'inline-block', padding:'4px 12px', borderRadius:8, background:'rgba(3,8,16,0.25)', marginBottom:10 }}>
                    <span style={{ fontSize:13, fontWeight:900, color:'#030810' }}>{nextFixture.team}</span>
                  </div>
                )}

                <p style={{ fontSize:28, fontWeight:900, color:'#030810', marginBottom:20, lineHeight:1.1 }}>
                  vs {nextFixture.opponent}
                </p>

                <div style={{ background:'rgba(3,8,16,0.85)', borderRadius:16, padding:'18px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { icon:'📅', val:fDate(nextFixture.fixture_date) },
                    ...(nextFixture.fixture_time ? [{ icon:'🕐', val:fTime(nextFixture.fixture_time) }] : []),
                    ...(nextFixture.venue        ? [{ icon:'📍', val:nextFixture.venue }] : []),
                    ...(nextFixture.home_away    ? [{ icon:'🏟️', val:nextFixture.home_away }] : []),
                  ].map((row,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:14 }}>{row.icon}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:'white' }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ borderRadius:24, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', backdropFilter:'blur(8px)', padding:40, display:'flex', alignItems:'center', justifyContent:'center', minHeight:220 }}>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.3)', fontWeight:700 }}>No upcoming fixtures</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
