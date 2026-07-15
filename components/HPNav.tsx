'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

const G      = '#10b981';
const BG     = '#060c1a';
const BORDER = 'rgba(255,255,255,0.07)';

const NAV = [
  { href:'/hp',                label:'Dashboard',       d:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { href:'/hp/students',       label:'Students',        d:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 0 1 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { href:'/hp/attendance',     label:'Attendance',      d:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { href:'/hp/testing',        label:'Testing',         d:'M22 12h-4l-3 9L9 3l-3 9H2' },
  { href:'/hp/trends',         label:'Trends',          d:'M23 6L13.5 15.5 8.5 10.5 1 18 M17 6h6v6' },
  { href:'/hp/classes',        label:'Classes',         d:'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
  { href:'/hp/history',        label:'History',         d:'M3 3v5h5 M3.05 13A9 9 0 1 0 6 5.3L3 8 M12 7v5l4 2' },
];

function Icon({ d, size=16 }: { d:string; size?:number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" style={{ width:size, height:size, flexShrink:0 }}>
      {d.split(' M').map((seg, i) => <path key={i} d={i===0 ? seg : 'M'+seg}/>)}
    </svg>
  );
}

export default function HPNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [open, setOpen] = React.useState(false);

  const active = (href: string) => href === '/hp' ? pathname === '/hp' : pathname.startsWith(href);

  async function logout() {
    try { await fetch('/api/hp/logout', { method:'POST', credentials:'include' }); } catch {}
    router.push('/hp-login');
  }

  return (
    <>
      <style>{`
        .hp-nb:hover { background:rgba(255,255,255,0.05)!important; color:white!important; }
        .hp-sidebar { display:flex; }
        @media(max-width:1024px){ .hp-sidebar { display:none!important; } }
        .hp-mob { display:none; }
        @media(max-width:1024px){ .hp-mob { display:flex!important; } }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hp-sidebar" style={{
        width:228, flexShrink:0, position:'fixed', inset:'0 auto 0 0',
        background:BG, borderRight:`1px solid ${BORDER}`,
        flexDirection:'column', zIndex:40, overflowY:'auto',
      }}>
        <div style={{ padding:'20px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:12 }}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={36} height={36} style={{ objectFit:'contain', flexShrink:0 }}/>
          <div>
            <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>St Benedict's</p>
            <p style={{ fontSize:13, fontWeight:800, color:'white' }}>High Performance</p>
          </div>
        </div>
        <nav style={{ padding:'10px', flex:1 }}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className="hp-nb" style={{
              display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
              borderRadius:10, marginBottom:2, textDecoration:'none', transition:'all 0.15s',
              background: active(n.href) ? G : 'transparent',
              color: active(n.href) ? 'white' : 'rgba(255,255,255,0.42)',
              fontWeight: active(n.href) ? 700 : 500, fontSize:13,
            }}>
              <Icon d={n.d}/>{n.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding:'12px 10px', borderTop:`1px solid ${BORDER}` }}>
          <Link href="/hp/admin/rollover" className="hp-nb" style={{
            display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10,
            color:'rgba(251,191,36,0.7)', textDecoration:'none', fontSize:12, fontWeight:700,
            background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.15)',
            marginBottom:6, transition:'all 0.15s',
          }}>
            <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={13}/>
            Year End Rollover
          </Link>
          <Link href="/" className="hp-nb" style={{
            display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10,
            color:'rgba(255,255,255,0.35)', textDecoration:'none', fontSize:12, fontWeight:500,
            marginBottom:4, transition:'all 0.15s',
          }}>
            <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" size={13}/>
            Departments
          </Link>
          <button onClick={logout} className="hp-nb" style={{
            width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
            borderRadius:10, border:'none', cursor:'pointer', color:'rgba(248,113,113,0.65)',
            fontSize:12, fontWeight:500, background:'transparent', textAlign:'left', transition:'all 0.15s',
          }}>
            <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={13}/>
            Logout
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="hp-mob" style={{
        position:'fixed', top:0, left:0, right:0, zIndex:50,
        background:'rgba(6,12,26,0.97)', backdropFilter:'blur(12px)',
        borderBottom:`1px solid ${BORDER}`, height:54,
        alignItems:'center', justifyContent:'space-between', padding:'0 16px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={28} height={28} style={{ objectFit:'contain' }}/>
          <p style={{ fontSize:14, fontWeight:800, color:'white' }}>High Performance</p>
        </div>
        <button onClick={() => setOpen(true)} style={{
          width:38, height:38, borderRadius:10, border:`1px solid ${BORDER}`,
          background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center',
          justifyContent:'center', cursor:'pointer', color:'white',
        }}>
          <Icon d="M3 6h18M3 12h18M3 18h18" size={17}/>
        </button>
      </header>

      {/* ── MOBILE SLIDE-OUT MENU ── */}
      {open && (
        <div style={{ position:'fixed', inset:0, zIndex:60 }} onClick={() => setOpen(false)}>
          {/* Backdrop */}
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)' }}/>

          {/* Panel */}
          <div style={{
            position:'absolute', left:0, top:0, bottom:0, width:'75%', maxWidth:300,
            background:'#040810', borderRight:`1px solid ${BORDER}`,
            display:'flex', flexDirection:'column', overflowY:'auto',
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px', borderBottom:`1px solid ${BORDER}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Image src="/st-benedicts-logo.png" alt="SBC" width={28} height={28} style={{ objectFit:'contain' }}/>
                <p style={{ fontSize:13, fontWeight:800, color:'white' }}>High Performance</p>
              </div>
              <button onClick={() => setOpen(false)} style={{
                width:32, height:32, borderRadius:8, border:`1px solid ${BORDER}`,
                background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center',
                justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)',
              }}>
                <Icon d="M18 6L6 18M6 6l12 12" size={14}/>
              </button>
            </div>

            {/* Nav items */}
            <nav style={{ flex:1, padding:'10px 10px' }}>
              {NAV.map(n => {
                const isAct = active(n.href);
                return (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)} style={{
                    display:'flex', alignItems:'center', gap:14, padding:'13px 16px',
                    borderRadius:12, marginBottom:4, textDecoration:'none', transition:'all 0.15s',
                    background: isAct ? `${G}15` : 'transparent',
                    color: isAct ? G : 'rgba(255,255,255,0.55)',
                    fontWeight: isAct ? 700 : 500, fontSize:14,
                    borderLeft: isAct ? `3px solid ${G}` : '3px solid transparent',
                  }}>
                    <Icon d={n.d} size={18}/>
                    {n.label}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div style={{ padding:'12px 10px', borderTop:`1px solid ${BORDER}` }}>
              <Link href="/hp/admin/rollover" onClick={() => setOpen(false)} style={{
                display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderRadius:12,
                color:'rgba(251,191,36,0.8)', textDecoration:'none', fontSize:14, fontWeight:700,
                background:'rgba(251,191,36,0.07)', border:'1px solid rgba(251,191,36,0.18)',
                marginBottom:8,
              }}>
                <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={18}/>
                Year End Rollover
              </Link>
              <Link href="/" style={{
                display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderRadius:12,
                color:'rgba(255,255,255,0.4)', textDecoration:'none', fontSize:14, fontWeight:500,
                marginBottom:4,
              }}>
                <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" size={18}/>
                Departments
              </Link>
              <button onClick={logout} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px',
                borderRadius:12, border:'none', cursor:'pointer', color:'rgba(248,113,113,0.7)',
                fontSize:14, fontWeight:500, background:'transparent', textAlign:'left',
              }}>
                <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={18}/>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
