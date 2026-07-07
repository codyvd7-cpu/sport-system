'use client';
import Image from 'next/image';
import Link from 'next/link';
import { type SportKey, getSportLabel, getSportColor } from '@/lib/sports';

interface Props { sport: SportKey; color: string; }

export default function PortalNav({ sport, color }: Props) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(3,8,16,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 60, gap: 16 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={32} height={32} style={{ objectFit: 'contain' }}/>
          <div style={{ lineHeight: 1.2 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>St Benedict's College</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{getSportLabel(sport)} Department</p>
          </div>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex" style={{ gap: 4 }}>
          {[['#this-week','This Week'],['#fixtures','Fixtures'],['#results','Results'],['#resources','Resources']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: 8, textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              {label}
            </a>
          ))}
        </div>

        {/* Player login — primary CTA */}
        <Link href="/player/auth" style={{
          fontSize: 12, fontWeight: 800, padding: '8px 18px', borderRadius: 10,
          background: `${color}18`, color, border: `1px solid ${color}40`,
          textDecoration: 'none', transition: 'all .15s', whiteSpace: 'nowrap',
        }}>
          Player Login
        </Link>

        {/* Coach login — secondary */}
        <Link href="/portal-login" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Staff
        </Link>
      </div>
    </nav>
  );
}
