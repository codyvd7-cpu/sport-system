'use client';
import Image from 'next/image';
type Row = Record<string, any>;
interface Props { sponsors: Row[]; loading: boolean; }

export default function SponsorStrip({ sponsors, loading }: Props) {
  if (!loading && sponsors.length === 0) return null;
  return (
    <section style={{ padding: '0 24px 60px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 40 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.22em', textAlign: 'center', marginBottom: 24 }}>Proudly Supported By</p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 40 }}>
          {sponsors.map((s, i) => (
            <div key={s.id || i} style={{ opacity: 0.5, transition: 'opacity .2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
              {s.logo_url
                ? <Image src={s.logo_url} alt={s.name || 'Sponsor'} width={110} height={40} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}/>
                : <p style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.55)' }}>{s.name}</p>
              }
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
