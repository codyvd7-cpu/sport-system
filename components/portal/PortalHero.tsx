'use client';
import * as React from 'react';
import Link from 'next/link';
import { SPORTS, type SportKey, getSportColor } from '@/lib/sports';
import { fmtTime12h } from '@/lib/format';
import { useBranding } from '@/components/BrandingProvider';
import { useTilt } from '@/components/portal/useTilt';

type Row = Record<string, any>;

function fDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' });
}
const fTime = (t?: string) => fmtTime12h(t);

interface Props { sport: SportKey; nextFixture: Row|null; }

export default function PortalHero({ sport, nextFixture }: Props) {
  const { branding, sports } = useBranding();
  const cfg   = SPORTS[sport];
  const color = getSportColor(sport);
  const fixTerm = cfg?.terminology?.fixture ?? 'Fixture';

  // The school's OWN photograph for this sport, falling back to the shared
  // graphic. Reading the global image directly meant every school's portal
  // showed the same picture — so one school's kit and crest appeared on
  // another school's page.
  const schoolSport = sports?.find(sp => sp.key === sport);
  const heroImg = schoolSport?.heroImage || cfg?.portal?.heroImage;
  const crest   = branding.logoUrl;
  const standfirst = branding.yearTheme || branding.motto;

  const [mounted, setMounted] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ── Scroll parallax: the photo and crest drift up slower than the page, so
  // the hero gains real depth as you scroll past it. One rAF-throttled scroll
  // listener writing two transforms; disabled under reduced-motion.
  const imgRef   = React.useRef<HTMLImageElement>(null);
  const crestRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (imgRef.current)   imgRef.current.style.transform   = `translate3d(0, ${y * 0.18}px, 0) scale(1.06)`;
        if (crestRef.current) crestRef.current.style.transform = `translate3d(0, ${y * 0.08}px, 0)`;
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [reduced]);

  // ── Crest pointer parallax: the watermark leans a few pixels toward the
  // cursor — a quiet depth cue behind the masthead, never a moving logo.
  const [crestShift, setCrestShift] = React.useState({ x: 0, y: 0 });
  const onHeroMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setCrestShift({ x: px * 18, y: py * 18 });
  };

  const tilt = useTilt({ max: 6, scale: 1.015, lift: 6 });

  const fadeUp = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(16px)',
    transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section className="ph-section" onMouseMove={onHeroMove}
      style={{ position:'relative', overflow:'hidden', minHeight:'clamp(560px, 88vh, 780px)', display:'flex', alignItems:'flex-end' }}>
      <style>{`
        @keyframes ph-sweep {
          0%   { transform: translateX(-120%) skewX(-18deg); opacity:0; }
          18%  { opacity:.5; }
          40%  { transform: translateX(160%)  skewX(-18deg); opacity:0; }
          100% { transform: translateX(160%)  skewX(-18deg); opacity:0; }
        }
        @keyframes ph-rule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) {
          .ph-sweep { animation: none !important; display:none; }
        }
        @media (max-width: 760px) {
          .ph-section { min-height: auto !important; }
          .ph-wrap { padding: 88px 18px 40px !important; }
          .ph-grid { gap: 26px !important; }
          .ph-ctas { gap: 10px !important; }
          .ph-ctas a { flex: 1 1 100%; justify-content: center !important; text-align: center; padding: 14px 20px !important; }
          .ph-card-pad { padding: 22px 18px 22px !important; }
          .ph-card-title { font-size: 25px !important; }
          .ph-card-details { padding: 16px 16px !important; }
          .ph-crest { opacity:.05 !important; width: 340px !important; height: 340px !important; }
        }
      `}</style>

      {/* ── Full-bleed cinematic image ── */}
      {heroImg && (
        <div style={{ position:'absolute', inset:0, zIndex:0, overflow:'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={heroImg} alt="" style={{
            width:'100%', height:'120%', objectFit:'cover', objectPosition:'center 18%',
            transform: mounted ? 'translate3d(0,0,0) scale(1.06)' : 'translate3d(0,0,0) scale(1.12)',
            transition:'transform 1.6s cubic-bezier(0.16,1,0.3,1)', willChange:'transform',
          }}/>
          {/* Layered depth gradients */}
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(180deg, rgba(3,8,16,0.35) 0%, rgba(3,8,16,0.55) 35%, #030810 92%)` }}/>
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg, rgba(3,8,16,0.96) 0%, rgba(3,8,16,0.55) 42%, rgba(3,8,16,0.15) 75%, rgba(3,8,16,0.5) 100%)` }}/>
          {/* A single slow light-sweep across the image — like a floodlight
              passing. Fires once on load, then rests. */}
          <div className="ph-sweep" style={{
            position:'absolute', top:0, bottom:0, left:0, width:'38%',
            background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
            animation:'ph-sweep 4.8s cubic-bezier(0.16,1,0.3,1) 0.7s 1', pointerEvents:'none',
          }}/>
        </div>
      )}

      {/* ── Crest watermark — the school's own mark, set large and low behind
          the masthead like an embossed seal on a programme cover. Leans
          toward the cursor for depth; drifts on scroll. Decorative only. */}
      {crest && (
        <div ref={crestRef} aria-hidden style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none' }}>
          <div className="ph-crest" style={{
            position:'absolute', right:'4%', top:'50%', width:520, height:520,
            transform:`translate(${crestShift.x}px, calc(-50% + ${crestShift.y}px))`,
            transition:'transform .5s cubic-bezier(0.16,1,0.3,1)',
            opacity:0.08, filter:'saturate(0.2) brightness(1.6)', willChange:'transform',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={crest} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
          </div>
        </div>
      )}

      <div className="ph-wrap" style={{ position:'relative', zIndex:1, padding:'120px 24px 64px', maxWidth:1240, margin:'0 auto', width:'100%' }}>
        <div style={{ display:'grid', gap:48, alignItems:'flex-end' }} className="ph-grid lg:grid-cols-[1fr_400px]">

          {/* Left — Heritage masthead. */}
          <div>
            <p style={{
              fontFamily:'var(--font-ui)', fontSize:13, fontWeight:600, letterSpacing:'0.06em',
              fontVariantCaps:'all-small-caps', color:'rgba(244,241,234,0.6)', marginBottom:16, ...fadeUp(0),
            }}>
              {branding.name}
            </p>

            <h1 style={{
              fontFamily:'var(--font-display)', fontOpticalSizing:'auto', fontWeight:600,
              fontSize:'clamp(44px,6.5vw,84px)', letterSpacing:'-0.015em', lineHeight:0.98,
              color:'rgba(244,241,234,0.96)', marginBottom:18, ...fadeUp(0.08),
            }}>
              {cfg?.portal?.headline ?? cfg?.label ?? sport}
            </h1>

            {/* Accent rule that draws itself in — a small, expensive-feeling
                detail borrowed from print title pages. */}
            <div style={{
              height:2, width:72, background:color, borderRadius:2, transformOrigin:'left',
              marginBottom:22, animation: reduced ? undefined : 'ph-rule 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s both',
            }}/>

            {/* The school's year theme or motto — its own voice, not Altus's. */}
            {standfirst && (
              <p style={{
                fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:500,
                fontSize:'clamp(15px,1.8vw,19px)', color:'rgba(244,241,234,0.7)',
                lineHeight:1.5, maxWidth:460, marginBottom:16, ...fadeUp(0.16),
              }}>
                {standfirst}
              </p>
            )}

            <p style={{
              fontFamily:'var(--font-ui)', fontSize:'clamp(14px,1.6vw,16px)',
              color:'rgba(244,241,234,0.58)', lineHeight:1.7, maxWidth:480, marginBottom:34, ...fadeUp(0.22),
            }}>
              {cfg?.portal?.description ?? 'Fixtures, results and the week ahead.'}
            </p>

            <div className="ph-ctas" style={{ display:'flex', gap:12, flexWrap:'wrap', ...fadeUp(0.3) }}>
              <a href="#this-week" style={{
                fontFamily:'var(--font-ui)', fontSize:14, fontWeight:600, padding:'13px 28px',
                borderRadius:10, background:color, color:'#0A0D12', textDecoration:'none',
                boxShadow:`0 10px 30px -8px ${color}66`,
              }}>
                This week
              </a>
              <Link href="/player/auth" style={{
                fontFamily:'var(--font-ui)', fontSize:14, fontWeight:600, padding:'13px 28px',
                borderRadius:10, background:'transparent', color:'rgba(244,241,234,0.75)',
                border:'1px solid rgba(244,241,234,0.2)', textDecoration:'none',
              }}>
                Sign in
              </Link>
            </div>
          </div>

          {/* Right — Next Fixture: hero-grade card with real 3D pointer tilt */}
          <div style={fadeUp(0.38)}>
            {nextFixture ? (
              <Link href={`/portal/fixtures?sport=${sport}&date=${nextFixture.fixture_date}`}
                ref={tilt.ref as any}
                onMouseMove={tilt.onMouseMove}
                onMouseLeave={tilt.onMouseLeave}
                style={{
                  position:'relative', borderRadius:26, overflow:'hidden', display:'block',
                  background: `linear-gradient(155deg, ${color} 0%, ${color}cc 45%, #0a1120 100%)`,
                  boxShadow: `0 28px 70px -14px ${color}70, 0 0 0 1px ${color}55`,
                  textDecoration:'none', transformStyle:'preserve-3d',
                  transition:'transform .3s cubic-bezier(0.16,1,0.3,1), box-shadow .3s cubic-bezier(0.16,1,0.3,1)',
                  willChange:'transform',
                }}>

                {/* Static shine + corner glow */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'55%', background:'linear-gradient(180deg, rgba(255,255,255,0.22), transparent)', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', bottom:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.15)', filter:'blur(40px)', pointerEvents:'none' }}/>

                <div className="ph-card-pad" style={{ position:'relative', padding:'28px 28px 30px' }}>
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

                  <p className="ph-card-title" style={{ fontSize:32, fontWeight:900, color:'#030810', marginBottom:22, lineHeight:1.05, letterSpacing:'-0.02em' }}>
                    vs {nextFixture.opponent}
                  </p>

                  <div className="ph-card-details" style={{ background:'rgba(3,8,16,0.88)', borderRadius:18, padding:'20px 22px', display:'flex', flexDirection:'column', gap:12 }}>
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

                {/* Cursor-tracked sheen — lives above the card, below pointer */}
                <div style={tilt.sheen}/>
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
