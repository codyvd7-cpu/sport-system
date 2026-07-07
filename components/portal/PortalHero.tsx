'use client';
import { type SportKey, getSportLabel, getSportTerm } from '@/lib/sports';

type Row = Record<string, any>;

function fDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' });
}
function fTime(t?: string) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

interface Props { sport: SportKey; color: string; nextFixture: Row | null; }

export default function PortalHero({ sport, color, nextFixture }: Props) {
  const label = getSportLabel(sport);
  const fixtureTerm = getSportTerm(sport, 'fixture');

  return (
    <section style={{ padding: '48px 20px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Eyebrow */}
      <p style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 8 }}>
        Live Sport Portal
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }} className="md:grid-cols-[1fr_340px]">
        {/* Left — identity */}
        <div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'white', marginBottom: 12 }}>
            St Benedict's<br/>
            <span style={{ color }}>
              {label}
            </span>
          </h1>
          <p style={{ fontSize: 'clamp(13px, 1.6vw, 16px)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 480, marginBottom: 24 }}>
            The live home for fixtures, training schedules, programmes and department notices.
          </p>
          {/* Stat strip */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'School', value: "St Benedict's" },
              { label: 'Sport', value: label },
              { label: 'Season', value: new Date().getFullYear().toString() },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Next Fixture card */}
        {nextFixture ? (
          <div style={{
            borderRadius: 20, border: `1px solid ${color}30`,
            background: `linear-gradient(135deg, ${color}10, rgba(3,8,16,0.6))`,
            padding: 24, position: 'relative', overflow: 'hidden',
          }}>
            {/* Accent glow */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: `${color}15`, filter: 'blur(30px)' }}/>
            <div style={{ position: 'relative' }}>
              <p style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 12 }}>
                Next {fixtureTerm}
              </p>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 4, lineHeight: 1.1 }}>
                {nextFixture.team || 'SBC'}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
                vs {nextFixture.opponent}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { icon: '📅', val: fDate(nextFixture.fixture_date) },
                  nextFixture.fixture_time ? { icon: '🕐', val: fTime(nextFixture.fixture_time) } : null,
                  nextFixture.venue ? { icon: '📍', val: nextFixture.venue } : null,
                  nextFixture.home_away ? { icon: '🏟', val: nextFixture.home_away } : null,
                ].filter(Boolean).map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12 }}>{row!.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>{row!.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>No upcoming fixtures</p>
          </div>
        )}
      </div>
    </section>
  );
}
