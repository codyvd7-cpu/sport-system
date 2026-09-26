'use client';
import * as React from 'react';
import Link from 'next/link';
import { SPORTS, type SportKey, getSportColor } from '@/lib/sports';
import { fmtTime12h } from '@/lib/format';
import { useBranding } from '@/components/BrandingProvider';

// ─── PortalHero ────────────────────────────────────────────────────────────────
// Rebuilt as a matchday panel rather than a SaaS dashboard header.
//
// What was removed, and why — these are the things that made it read as a
// generic AI-built product rather than a school's own sport page:
//   · "LIVE SPORT PORTAL" pill with a pulsing dot
//   · shine sweep + blurred corner glow on the fixture card
//   · emoji icons (📅 🕐 📍) standing in for real labels
//   · hover lift-and-scale on the card
//   · glassmorphism (backdrop blur) on almost every surface
//   · a full-bleed gradient card in the school colour, which shouted louder
//     than the actual information on it
//
// What replaces it: typography doing the work. A condensed headline at real
// scale, the fixture presented as a proper scoreboard with labelled fields,
// and the school colour used as a precise accent rather than a wash. The
// photograph stays — it's genuinely the school's own and earns its place.

type Row = Record<string, any>;

const fDate = (d: string) =>
  new Date(d).toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' });
const fTime = (t?: string) => fmtTime12h(t);

/** Days until a fixture, phrased the way a parent would say it. */
function countdown(dateStr: string): string {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (days < 0)  return 'Played';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7)  return `In ${days} days`;
  return `In ${Math.floor(days / 7)} week${days >= 14 ? 's' : ''}`;
}

interface Props { sport: SportKey; nextFixture: Row|null; }

export default function PortalHero({ sport, nextFixture }: Props) {
  const { branding, sports } = useBranding();
  const cfg   = SPORTS[sport];
  const color = getSportColor(sport);
  const fixTerm = cfg?.terminology?.fixture ?? 'Fixture';

  const schoolSport = sports?.find(sp => sp.key === sport);
  const heroImg = schoolSport?.heroImage || cfg?.portal?.heroImage;

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t); }, []);

  const rise = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity .6s ease ${delay}s, transform .7s cubic-bezier(.16,1,.3,1) ${delay}s`,
  });

  const detail = nextFixture ? [
    { label: 'Date',  value: fDate(nextFixture.fixture_date) },
    ...(nextFixture.fixture_time ? [{ label: 'Time',  value: fTime(nextFixture.fixture_time) }] : []),
    ...(nextFixture.venue        ? [{ label: 'Venue', value: nextFixture.venue }] : []),
    ...(nextFixture.home_away    ? [{ label: 'Ground', value: String(nextFixture.home_away).toUpperCase() }] : []),
  ] : [];

  return (
    <section className="ph" style={{ position:'relative', overflow:'hidden', display:'flex', alignItems:'flex-end',
      minHeight:'clamp(520px, 82vh, 720px)' }}>
      <style>{`
        .ph-anton { font-family: 'Anton', Impact, sans-serif; }
        @media (max-width: 860px) {
          .ph { min-height: auto !important; }
          .ph-wrap { padding: 96px 18px 36px !important; }
          .ph-grid { grid-template-columns: 1fr !important; gap: 30px !important; }
          .ph-detail { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 861px) {
          .ph-grid { grid-template-columns: 1fr 320px; }
        }
      `}</style>

      {heroImg && (
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImg} alt="" style={{
            width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 20%',
            transform: mounted ? 'scale(1)' : 'scale(1.05)',
            transition:'transform 1.8s cubic-bezier(.16,1,.3,1)',
          }}/>
          <div style={{ position:'absolute', inset:0,
            background:'linear-gradient(180deg, rgba(3,8,16,0.30) 0%, rgba(3,8,16,0.62) 45%, #030810 94%)' }}/>
        </div>
      )}

      <div className="ph-wrap" style={{ position:'relative', zIndex:1, padding:'120px 28px 60px', maxWidth:1240, margin:'0 auto', width:'100%' }}>
        <div className="ph-grid" style={{ display:'grid', gap:52, alignItems:'end' }}>

          <div>
            {/* A plain rule and label instead of a glowing pill badge. */}
            <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:20, ...rise(0) }}>
              {branding.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={branding.logoUrl} alt="" style={{
                  width:44, height:44, objectFit:'contain',
                  filter:'drop-shadow(0 3px 10px rgba(0,0,0,.6))',
                }}/>
              )}
              <div>
                <p style={{ fontSize:12.5, fontWeight:700, color:'white', letterSpacing:'0.02em' }}>
                  {branding.name}
                </p>
                {(branding.yearTheme || branding.motto) && (
                  <p style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.45)',
                    textTransform:'uppercase', letterSpacing:'0.18em', marginTop:2 }}>
                    {branding.yearTheme || branding.motto}
                  </p>
                )}
              </div>
            </div>

            <h1 className="ph-anton" style={{
              fontSize:'clamp(46px, 9vw, 104px)', lineHeight:0.88, color:'white',
              letterSpacing:'0.01em', marginBottom:22, ...rise(0.06),
            }}>
              {(cfg?.portal?.headline ?? cfg?.label ?? sport).toUpperCase()}
            </h1>

            <p style={{
              fontSize:'clamp(14px,1.6vw,16px)', color:'rgba(255,255,255,0.55)', lineHeight:1.65,
              maxWidth:440, marginBottom:32, ...rise(0.14),
            }}>
              {cfg?.portal?.description ?? 'Fixtures, results and the week ahead.'}
            </p>

            {/* One action only. The nav carries "Player Login" and the card
                further down explains what signing in gets you — three prompts
                for the same thing on one screen is noise, not emphasis. */}
            <div style={{ display:'flex', ...rise(0.2) }}>
              <a href="#this-week" style={{
                fontSize:13.5, fontWeight:700, padding:'13px 28px', borderRadius:10,
                background:color, color:'#03060c', textDecoration:'none',
              }}>
                This week
              </a>
            </div>
          </div>

          {/* ── Next fixture, as a scoreboard panel ── */}
          <div style={rise(0.26)}>
            {nextFixture ? (
              <Link href={`/portal/fixtures?sport=${sport}&date=${nextFixture.fixture_date}`} style={{
                display:'block', textDecoration:'none', borderRadius:14, overflow:'hidden',
                background:'rgba(4,9,18,0.86)', border:'1px solid rgba(255,255,255,0.12)',
              }}>
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.09)',
                }}>
                  <span style={{ fontSize:10.5, fontWeight:700, color:'rgba(255,255,255,0.5)',
                    textTransform:'uppercase', letterSpacing:'0.2em' }}>
                    Next {fixTerm}
                  </span>
                  <span style={{ fontSize:10.5, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.14em' }}>
                    {countdown(nextFixture.fixture_date)}
                  </span>
                </div>

                <div style={{ padding:'16px 16px 15px' }}>
                  {nextFixture.team && (
                    <p style={{ fontSize:11.5, fontWeight:700, color, letterSpacing:'0.12em',
                      textTransform:'uppercase', marginBottom:8 }}>
                      {nextFixture.team}
                    </p>
                  )}
                  <p className="ph-anton" style={{ fontSize:25, lineHeight:1.02, color:'white', letterSpacing:'0.01em' }}>
                    {String(nextFixture.opponent || '').toUpperCase()}
                  </p>
                </div>

                {/* Labelled fields — a parent scanning for kick-off time can
                    find it, which emoji rows made harder, not easier. */}
                <div className="ph-detail" style={{
                  display:'grid', gridTemplateColumns:'1fr 1fr', borderTop:'1px solid rgba(255,255,255,0.09)',
                }}>
                  {detail.map((d, i) => (
                    <div key={d.label} style={{
                      padding:'10px 16px',
                      borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      borderTop:   i >= 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    }}>
                      <p style={{ fontSize:9.5, fontWeight:700, color:'rgba(255,255,255,0.35)',
                        textTransform:'uppercase', letterSpacing:'0.18em', marginBottom:4 }}>
                        {d.label}
                      </p>
                      <p style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,0.9)' }}>
                        {d.value}
                      </p>
                    </div>
                  ))}
                </div>
              </Link>
            ) : (
              <div style={{
                borderRadius:14, border:'1px solid rgba(255,255,255,0.1)',
                background:'rgba(4,9,18,0.7)', padding:'36px 20px', textAlign:'center',
              }}>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)' }}>
                  No {fixTerm.toLowerCase()}s scheduled yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
