'use client';
import Image from 'next/image';
type Row = Record<string, any>;
interface Props { sponsors: Row[]; loading: boolean; }

export default function SponsorStrip({ sponsors, loading }: Props) {
  if (!loading && sponsors.length === 0) return null;
  return (
    <section style={{ padding: '0 20px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 32 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', marginBottom: 20 }}>Proudly Supported By</p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 32 }}>
          {sponsors.map((s, i) => (
            <div key={s.id || i} style={{ opacity: 0.55, transition: 'opacity .2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.55')}>
              {s.logo_url
                ? <Image src={s.logo_url} alt={s.name || 'Sponsor'} width={100} height={36} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}/>
                : <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{s.name}</p>
              }
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
