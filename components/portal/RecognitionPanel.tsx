'use client';
import Image from 'next/image';
type Row = Record<string, any>;
interface Props { spotlight: Row[]; color: string; loading: boolean; }

export default function RecognitionPanel({ spotlight, color, loading }: Props) {
  if (!loading && spotlight.length === 0) return null;
  return (
    <section style={{ padding: '0 20px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Recognition</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {spotlight.map((s, i) => (
          <div key={s.id || i} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: 16, textAlign: 'center' }}>
            {s.photo_url && (
              <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px', border: `2px solid ${color}30` }}>
                <Image src={s.photo_url} alt={s.player_name || ''} width={56} height={56} style={{ objectFit: 'cover' }}/>
              </div>
            )}
            <p style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>{s.category || 'Recognition'}</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 2 }}>{s.player_name}</p>
            {s.team && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.team}</p>}
            {s.note && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.5 }}>{s.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
