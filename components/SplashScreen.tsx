'use client';
import * as React from 'react';
import Image from 'next/image';

export default function SplashScreen() {
  const [visible, setVisible] = React.useState(false);
  const [fading, setFading]   = React.useState(false);

  React.useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem('altus_splash')) return;
    sessionStorage.setItem('altus_splash', '1');
    setVisible(true);
    // Start fade out after 1.6s
    const t1 = setTimeout(() => setFading(true),  1600);
    // Remove from DOM after fade completes
    const t2 = setTimeout(() => setVisible(false), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position:   'fixed',
      inset:      0,
      zIndex:     9999,
      background: '#070c1a',
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection:  'column',
      gap: 24,
      opacity:    fading ? 0 : 1,
      transition: 'opacity 0.6s ease',
      pointerEvents: 'none',
    }}>
      <div style={{
        animation: 'altus-pop 0.6s cubic-bezier(0.34,1.4,0.64,1) both',
      }}>
        <Image
          src="/altus-icon.png"
          alt="Altus Performance"
          width={120}
          height={120}
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
      <div style={{
        opacity:   fading ? 0 : 1,
        transition:'opacity 0.4s ease',
        textAlign: 'center',
        animation: 'altus-fade 0.5s ease 0.4s both',
      }}>
        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   11,
          fontWeight: 800,
          letterSpacing: '0.3em',
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
        }}>ALTUS PERFORMANCE</p>
        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   9,
          letterSpacing: '0.2em',
          color: 'rgba(255,255,255,0.2)',
          textTransform: 'uppercase',
          marginTop: 4,
        }}>St Benedict&apos;s College</p>
      </div>
      <style>{`
        @keyframes altus-pop {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes altus-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
