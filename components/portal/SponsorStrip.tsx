'use client';
import Image from 'next/image';
type Row = Record<string, any>;
interface Props { sponsors: Row[]; loading: boolean; }

export default function SponsorStrip({ sponsors, loading }: Props) {
  if (!loading && sponsors.length === 0) return null;

  // Duplicate list for seamless infinite scroll
  const loop = [...sponsors, ...sponsors, ...sponsors];

  return (
    <section style={{ padding: '0 0 72px', maxWidth: '100%', margin: '0 auto', overflow:'hidden' }}>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .sponsor-track {
          animation: marquee 28s linear infinite;
          display: flex;
          align-items: center;
          width: fit-content;
        }
        .sponsor-track:hover { animation-play-state: paused; }
        .sponsor-item {
          transition: transform .35s cubic-bezier(0.16,1,0.3,1);
        }
        .sponsor-item:hover {
          transform: scale(1.08);
        }
      `}</style>

      <div style={{ maxWidth:1240, margin:'0 auto', padding:'0 24px 28px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.15))' }}/>
        <p style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.28em', whiteSpace:'nowrap' }}>
          Proudly Supported By
        </p>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg, rgba(255,255,255,0.15), transparent)' }}/>
      </div>

      {/* Marquee with edge fade masks */}
      <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:120, background:'linear-gradient(90deg, #030810, transparent)', zIndex:2, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:120, background:'linear-gradient(270deg, #030810, transparent)', zIndex:2, pointerEvents:'none' }}/>

        <div className="sponsor-track">
          {loop.map((s, i) => (
            <div key={i} className="sponsor-item" style={{
              flexShrink:0, margin:'0 20px', display:'flex', alignItems:'center', justifyContent:'center',
              minWidth:100, cursor:'default',
            }}>
              {s.logo_url ? (
                <Image src={s.logo_url} alt={s.name || 'Sponsor'} width={120} height={44} style={{ objectFit:'contain' }}/>
              ) : (
                <p style={{ fontSize:17, fontWeight:900, color:'rgba(255,255,255,0.5)', whiteSpace:'nowrap' }}>{s.name}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
