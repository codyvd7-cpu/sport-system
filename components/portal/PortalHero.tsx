'use client';
import Link from 'next/link';
import { SPORTS, type SportKey, getSportColor } from '@/lib/sports';

type Row = Record<string, any>;

function fDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'short' });
}
function fTime(t?: string) {
  if (!t) return '';
  const [h,m] = t.split(':'); const hr = parseInt(h);
  return `${hr>12?hr-12:hr}:${m} ${hr>=12?'PM':'AM'}`;
}

interface Props { sport: SportKey; nextFixture: Row|null; }

export default function PortalHero({ sport, nextFixture }: Props) {
  const cfg   = SPORTS[sport];
  const color = getSportColor(sport);
  const fixTerm = cfg?.terminology?.fixture ?? 'Fixture';

  return (
    <section style={{ position:'relative', overflow:'hidden', padding:'52px 24px 48px', maxWidth:1200, margin:'0 auto' }}>
      {/* Ambient glow */}
      <div style={{ position:'absolute', top:-120, left:-80, width:500, height:500, borderRadius:'50%', background:`${color}0a`, filter:'blur(80px)', pointerEvents:'none' }}/>

      <div style={{ display:'grid', gap:40, alignItems:'center' }}
        className="lg:grid-cols-[1fr_360px]">

        {/* Left — headline */}
        <div style={{ position:'relative' }}>
          {/* Eyebrow */}
          <p style={{ fontSize:10, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.35em', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ display:'inline-block', width:20, height:1.5, background:color, verticalAlign:'middle' }}/>
            Live Sport Portal
          </p>

          {/* Main title */}
          <h1 style={{ fontSize:'clamp(30px,5.5vw,58px)', fontWeight:900, letterSpacing:'-0.025em', lineHeight:1.0, color:'white', marginBottom:16 }}>
            {cfg?.portal?.headline ?? `ST BENEDICT'S ${(cfg?.label ?? sport).toUpperCase()}`}
          </h1>

          {/* Sub-heading */}
          <p style={{ fontSize:'clamp(16px,2.2vw,22px)', fontWeight:700, color:'rgba(255,255,255,0.55)', marginBottom:14 }}>
            This Week at a Glance
          </p>

          {/* Description */}
          <p style={{ fontSize:'clamp(13px,1.5vw,15px)', color:'rgba(255,255,255,0.38)', lineHeight:1.7, maxWidth:460, marginBottom:32 }}>
            {cfg?.portal?.description ?? 'Fixtures, training updates, programmes and department notices — all in one place.'}
          </p>

          {/* CTAs */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <a href="#this-week" style={{
              fontSize:13, fontWeight:800, padding:'12px 24px', borderRadius:12,
              background:color, color:'#030810', textDecoration:'none',
              transition:'opacity .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity='0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity='1')}>
              View This Week
            </a>
            <Link href="/player/auth" style={{
              fontSize:13, fontWeight:700, padding:'12px 24px', borderRadius:12,
              background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)',
              border:'1px solid rgba(255,255,255,0.12)', textDecoration:'none',
              transition:'all .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='white'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='rgba(255,255,255,0.7)'; }}>
              Player Login
            </Link>
          </div>
        </div>

        {/* Right — Next Fixture card */}
        {nextFixture ? (
          <div style={{ position:'relative', borderRadius:20, overflow:'hidden', border:`1px solid ${color}28`, background:`linear-gradient(145deg, ${color}0e 0%, rgba(3,8,16,0.7) 100%)` }}>
            {/* Glow */}
            <div style={{ position:'absolute', bottom:-60, right:-60, width:200, height:200, borderRadius:'50%', background:`${color}12`, filter:'blur(40px)', pointerEvents:'none' }}/>

            {/* Sport image */}
            {cfg?.portal?.heroImage && (
              <div style={{ height:140, overflow:'hidden', position:'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.portal.heroImage} alt={cfg.label} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(0.35) saturate(0.8)' }}/>
                <div style={{ position:'absolute', inset:0, background:`linear-gradient(to bottom, transparent 40%, rgba(3,8,16,0.95) 100%)` }}/>
                <p style={{ position:'absolute', top:14, left:18, fontSize:9, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.25em' }}>
                  Next {fixTerm}
                </p>
              </div>
            )}

            {/* Content */}
            <div style={{ padding:'20px 22px 22px', position:'relative' }}>
              <p style={{ fontSize:24, fontWeight:900, color:'white', marginBottom:4, lineHeight:1.1 }}>
                {nextFixture.team && <span style={{ color, marginRight:6 }}>{nextFixture.team}</span>}
                vs {nextFixture.opponent}
              </p>

              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:12 }}>
                {[
                  { label:'Date',  val:fDate(nextFixture.fixture_date) },
                  ...(nextFixture.fixture_time ? [{ label:'Time', val:fTime(nextFixture.fixture_time) }] : []),
                  ...(nextFixture.venue        ? [{ label:'Venue', val:nextFixture.venue }] : []),
                  ...(nextFixture.home_away    ? [{ label:'Type',  val:nextFixture.home_away }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.12em', minWidth:36 }}>{row.label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ borderRadius:20, border:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', padding:32, display:'flex', alignItems:'center', justifyContent:'center', minHeight:200 }}>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.18)', fontWeight:600 }}>No upcoming fixtures</p>
          </div>
        )}
      </div>

      {/* Bottom separator with sport color trace */}
      <div style={{ marginTop:48, height:1, background:`linear-gradient(90deg, transparent, ${color}30, transparent)` }}/>
    </section>
  );
}
