'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

const G = '#10b981';
const BG = '#060c1a';
const BORDER = 'rgba(255,255,255,0.07)';

const NAV_ITEMS = [
  { href:'/hp',            label:'Dashboard',  d:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { href:'/hp/students',   label:'Students',   d:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 0 1 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { href:'/hp/attendance', label:'Attendance', d:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { href:'/hp/testing',    label:'Testing',    d:'M22 12h-4l-3 9L9 3l-3 9H2' },
  { href:'/hp/trends',     label:'Trends',     d:'M23 6L13.5 15.5 8.5 10.5 1 18 M17 6h6v6' },
  { href:'/hp/classes',    label:'Classes',    d:'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" style={{ width:16, height:16, flexShrink:0 }}>
      {d.split(' M').map((seg, i) => <path key={i} d={i===0 ? seg : 'M'+seg}/>)}
    </svg>
  );
}

export default function HPNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);

  function isActive(href: string) {
    if (href === '/hp') return pathname === '/hp';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    try { await fetch('/api/hp/logout', { method:'POST', credentials:'include' }); } catch {}
    router.push('/hp-login');
  }

  return (
    <>
      <style>{`
        .hp-nbtn:hover { background: rgba(255,255,255,0.05) !important; color: white !important; }
        @media(max-width:1024px) { .hp-sidebar { display:none !important; } }
      `}</style>

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="hp-sidebar" style={{
        width:228, flexShrink:0, position:'fixed', inset:'0 auto 0 0',
        background:BG, borderRight:`1px solid ${BORDER}`,
        display:'flex', flexDirection:'column', zIndex:40, overflowY:'auto',
      }}>
        {/* Brand */}
        <div style={{ padding:'20px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:12 }}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={38} height={38} style={{ objectFit:'contain', flexShrink:0 }}/>
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>
              ST BENEDICT&apos;S COLLEGE
            </p>
            <p style={{ fontSize:13, fontWeight:800, color:'white', lineHeight:1 }}>High Performance</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding:'10px 10px', flex:1 }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className="hp-nbtn"
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 14px', borderRadius:10, marginBottom:2,
                  background: active ? G : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.42)',
                  fontWeight: active ? 700 : 500, fontSize:13,
                  textDecoration:'none', transition:'all 0.15s',
                }}>
                <NavIcon d={item.d}/>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Help widget */}
        <div style={{ margin:'0 12px 20px', borderRadius:12, background:'rgba(16,185,129,0.06)', border:`1px solid ${G}18`, padding:'14px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:`${G}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2} style={{width:14,height:14}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'white', marginBottom:2 }}>Need Help?</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', lineHeight:1.4 }}>Contact the High Performance team</p>
            </div>
          </div>
          <div style={{ marginTop:10, display:'flex', gap:6 }}>
            <Link href="/" style={{ flex:1, textAlign:'center', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.45)', padding:'6px 8px', borderRadius:8, border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.03)', textDecoration:'none' }}>
              ← Departments
            </Link>
            <button onClick={handleLogout} style={{ flex:1, fontSize:10, fontWeight:700, color:'rgba(248,113,113,0.8)', padding:'6px 8px', borderRadius:8, border:'1px solid rgba(248,113,113,0.15)', background:'rgba(248,113,113,0.06)', cursor:'pointer' }}>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header suppressHydrationWarning style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, borderBottom:`1px solid ${BORDER}`, background:'rgba(6,12,26,0.96)', backdropFilter:'blur(12px)', display:'none' }}
        className="mobile-header">
        <style>{`.mobile-header { display:flex !important; } @media(min-width:1025px){.mobile-header{display:none!important;}}`}</style>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:54, padding:'0 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Image src="/st-benedicts-logo.png" alt="SBC" width={30} height={30} style={{ objectFit:'contain' }}/>
            <p style={{ fontSize:14, fontWeight:800, color:'white' }}>High Performance</p>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ width:36, height:36, borderRadius:9, border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white' }}>
            {menuOpen
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M18 6L6 18M6 6l12 12"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        </div>
      </header>

      {/* ── MOBILE MENU ── */}
      {menuOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:45 }} onClick={() => setMenuOpen(false)}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}/>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:260, background:'#060c1a', borderRight:`1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'20px 16px', borderBottom:`1px solid ${BORDER}` }}>
              <p style={{ fontSize:13, fontWeight:800, color:'white' }}>High Performance</p>
            </div>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', color:isActive(item.href)?G:'rgba(255,255,255,0.6)', textDecoration:'none', fontSize:14, fontWeight:isActive(item.href)?700:500 }}>
                <NavIcon d={item.d}/>{item.label}
              </Link>
            ))}
            <div style={{ padding:'12px 16px', borderTop:`1px solid ${BORDER}`, marginTop:8 }}>
              <Link href="/" style={{ display:'block', marginBottom:8, fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.5)', padding:'8px 12px', borderRadius:9, border:`1px solid ${BORDER}`, textDecoration:'none' }}>← Departments</Link>
              <button onClick={handleLogout} style={{ width:'100%', fontSize:12, fontWeight:600, color:'#f87171', padding:'8px 12px', borderRadius:9, border:'1px solid rgba(248,113,113,0.2)', background:'rgba(248,113,113,0.06)', cursor:'pointer' }}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM TABS ── */}
      <nav suppressHydrationWarning className="mobile-header" style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, borderTop:`1px solid ${BORDER}`, background:'rgba(6,12,26,0.96)', backdropFilter:'blur(12px)', padding:'6px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-around' }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 8px', color:active?G:'rgba(255,255,255,0.4)', textDecoration:'none' }}>
                <NavIcon d={item.d}/>
                <span style={{ fontSize:9, fontWeight:600 }}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
