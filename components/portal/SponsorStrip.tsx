'use client';
import * as React from 'react';

// ── Official partners ──────────────────────────────────────────────────────────
// Logos live in /public/sponsors (white-background originals, trimmed).
// Each is presented on a white plinth — the premium way to show
// dark-on-white brand marks against the dark portal theme.
const PARTNERS = [
  { name: 'Omoda',     src: '/sponsors/omoda.png',     tag: 'Official Partner' },
  { name: 'Leukotape', src: '/sponsors/leukotape.png', tag: 'Official Partner' },
  { name: 'Bioteen',   src: '/sponsors/bioteen.png',   tag: 'Official Partner' },
  { name: 'Afrihost',  src: '/sponsors/afrihost.png',  tag: 'Official Partner' },
];

interface Props { color: string; }

export default function SponsorStrip({ color }: Props) {
  return (
    <section style={{ padding: '0 24px 72px', maxWidth: 1240, margin: '0 auto' }}>
      <style>{`
        .partner-card {
          transition: transform .3s cubic-bezier(0.16,1,0.3,1), box-shadow .3s ease, border-color .3s ease;
        }
        .partner-card:hover {
          transform: translateY(-5px);
        }
        .partner-plinth {
          position: relative;
          overflow: hidden;
        }
        .partner-plinth::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0; left: -80%;
          width: 55%;
          background: linear-gradient(105deg, transparent, rgba(255,255,255,0.9) 50%, transparent);
          transform: skewX(-18deg);
          transition: left .6s cubic-bezier(0.16,1,0.3,1);
          pointer-events: none;
        }
        .partner-card:hover .partner-plinth::after {
          left: 130%;
        }
        .partner-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .partner-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 400px) {
          .partner-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Section header — same language as the rest of the portal */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:26 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:color }}/>
        <div>
          <p style={{ fontSize:11, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.2em' }}>Partners</p>
          <p style={{ fontSize:20, fontWeight:900, color:'white' }}>Proudly Supported By</p>
        </div>
      </div>

      <div className="partner-grid">
        {PARTNERS.map((p) => (
          <div key={p.name} className="partner-card" style={{
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.012))',
            padding: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = `${color}55`;
              e.currentTarget.style.boxShadow = `0 18px 44px rgba(0,0,0,0.35), 0 0 0 1px ${color}30, 0 8px 32px ${color}18`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
            }}>

            {/* White plinth — logos shown unaltered on their native background */}
            <div className="partner-plinth" style={{
              borderRadius: 13,
              background: '#ffffff',
              height: 108,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 22px',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.name} style={{
                maxHeight: 52,
                maxWidth: '86%',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}/>
            </div>

            {/* Caption */}
            <div style={{ padding: '12px 8px 6px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:12.5, fontWeight:800, color:'rgba(255,255,255,0.85)' }}>{p.name}</p>
              <p style={{ fontSize:8.5, fontWeight:800, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.14em' }}>{p.tag}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
