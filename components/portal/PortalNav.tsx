'use client';
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type SportKey, getSportLabel, getSportColor } from '@/lib/sports';

interface Props { sport: SportKey; }

export default function PortalNav({ sport }: Props) {
  const color = getSportColor(sport);
  const label = getSportLabel(sport);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: scrolled ? 'rgba(3,8,16,0.85)' : 'rgba(3,8,16,0.4)',
      backdropFilter: 'blur(20px) saturate(1.4)',
      borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.09)' : 'transparent'}`,
      transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', gap: 24 }}>

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Image src="/st-benedicts-logo.png" alt="SBC" width={34} height={34} style={{ objectFit: 'contain' }}/>
          </div>
          <div style={{ lineHeight: 1.25 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>St Benedict's College</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }}/>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{label}</p>
            </div>
          </div>
        </Link>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/login" style={{
            fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.32)',
            textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color .15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color='rgba(255,255,255,0.65)')}
            onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.32)')}>
            Coach
          </Link>

          <Link href="/player/auth" style={{
            fontSize: 12.5, fontWeight: 800, padding: '9px 20px', borderRadius: 10,
            background: color, color: '#030810',
            textDecoration: 'none', whiteSpace: 'nowrap',
            boxShadow: `0 4px 16px ${color}40`,
            transition: 'all .18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 6px 20px ${color}60`; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=`0 4px 16px ${color}40`; }}>
            Player Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
