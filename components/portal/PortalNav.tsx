'use client';
import Image from 'next/image';
import Link from 'next/link';
import { type SportKey, getSportLabel, getSportColor } from '@/lib/sports';

interface Props { sport: SportKey; }

export default function PortalNav({ sport }: Props) {
  const color = getSportColor(sport);
  const label = getSportLabel(sport);

  return (
    <nav style={{
      position:'sticky', top:0, zIndex:50,
      background:'rgba(3,8,16,0.97)', backdropFilter:'blur(16px)',
      borderBottom:'1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', height:60, display:'flex', alignItems:'center', gap:20 }}>

        {/* Brand */}
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={30} height={30} style={{ objectFit:'contain' }}/>
          <div style={{ lineHeight:1.25 }}>
            <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.15em' }}>St Benedict's College</p>
            <p style={{ fontSize:12, fontWeight:800, color:'rgba(255,255,255,0.85)' }}>{label} Department</p>
          </div>
        </Link>

        {/* Accent divider */}
        <div style={{ width:1, height:28, background:'rgba(255,255,255,0.08)', flexShrink:0 }}/>

        {/* Section links */}
        <div style={{ display:'flex', gap:2, flex:1, overflow:'hidden' }}>
          {[['#this-week','This Week'],['#fixtures','Fixtures'],['#results','Results'],['#resources','Resources']].map(([href, lbl]) => (
            <a key={href} href={href} style={{
              fontSize:12, fontWeight:600, padding:'6px 12px', borderRadius:8,
              color:'rgba(255,255,255,0.45)', textDecoration:'none', whiteSpace:'nowrap',
              transition:'color .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color='white')}
              onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.45)')}>
              {lbl}
            </a>
          ))}
        </div>

        {/* Coach login — quiet */}
        <Link href="/portal-login" style={{
          fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.28)',
          textDecoration:'none', whiteSpace:'nowrap', flexShrink:0,
          transition:'color .15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color='rgba(255,255,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.28)')}>
          Coach Login
        </Link>

        {/* Player login — primary CTA */}
        <Link href="/player/auth" style={{
          fontSize:12, fontWeight:800, padding:'8px 20px', borderRadius:10, flexShrink:0,
          background:`${color}18`, color, border:`1px solid ${color}40`,
          textDecoration:'none', whiteSpace:'nowrap', transition:'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background=`${color}28`; }}
          onMouseLeave={e => { e.currentTarget.style.background=`${color}18`; }}>
          Player Login
        </Link>
      </div>
    </nav>
  );
}
