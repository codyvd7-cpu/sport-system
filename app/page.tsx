'use client';
import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const PHOTOS = ['/sbc-photo-4.jpg','/sbc-photo-1.jpg','/sbc-photo-3.jpg','/sbc-photo-2.jpg'];

const DEPTS = [
  { id:'hockey',    label:'HOCKEY',     lines:['Fixtures · Results','Schedule'],    href:'/portal-login?sport=hockey', live:true,  accent:'#38bdf8' },
  { id:'hp',        label:'HP CLASSES', lines:['Testing · Trends','Athletes'],       href:'/hp-login',                  live:true,  accent:'#10b981' },
  { id:'rugby',     label:'RUGBY',      lines:['Fixtures · Results','Schedule'],    href:'/portal-login?sport=rugby',  live:true,  accent:'#f87171' },
  { id:'cricket',   label:'CRICKET',    lines:['Coming Soon'],                       href:'#',                          live:false, accent:'#fbbf24' },
  { id:'swimming',  label:'SWIMMING',   lines:['Coming Soon'],                       href:'#',                          live:false, accent:'#818cf8' },
  { id:'rowing',    label:'ROWING',     lines:['Coming Soon'],                       href:'#',                          live:false, accent:'#34d399' },
  { id:'athletics', label:'ATHLETICS',  lines:['Coming Soon'],                       href:'#',                          live:false, accent:'#fb923c' },
  { id:'waterpolo', label:'WATER POLO', lines:['Coming Soon'],                       href:'#',                          live:false, accent:'#60a5fa' },
  { id:'soccer',    label:'SOCCER',     lines:['Coming Soon'],                       href:'#',                          live:false, accent:'#22c55e' },
  { id:'golf',      label:'GOLF',       lines:['Coming Soon'],                       href:'#',                          live:false, accent:'#fbbf24' },
];

const ACTIVE_FILTER = 'brightness(0) saturate(100%) invert(75%) sepia(50%) saturate(500%) hue-rotate(185deg) brightness(115%)';

export default function LandingPage() {
  const [mounted,    setMounted]    = React.useState(false);
  const [photo,      setPhoto]      = React.useState(0);
  const [favs,       setFavs]       = React.useState<string[]>([]);
  const [isMobile,   setIsMobile]   = React.useState(false);
  // Desktop page carousel
  const [deskPage,   setDeskPage]   = React.useState(0);
  // Mobile 3D carousel
  const [mobileIdx,  setMobileIdx]  = React.useState(0);
  const [animating,  setAnimating]  = React.useState(false);
  const touchStart = React.useRef(0);
  const touchEnd   = React.useRef(0);

  const DESK_PER = 4;

  React.useEffect(() => {
    setMounted(true);
    try { const s = localStorage.getItem('ks_fav'); if(s) setFavs(JSON.parse(s)); } catch{}
    const check = () => setIsMobile(window.innerWidth < 680);
    check();
    window.addEventListener('resize', check);
    const t = setInterval(() => setPhoto(p=>(p+1)%PHOTOS.length), 5000);
    return ()=>{ clearInterval(t); window.removeEventListener('resize', check); };
  }, []);

  function toggleFav(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setFavs(prev => {
      const next = prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id];
      try{ localStorage.setItem('ks_fav', JSON.stringify(next)); }catch{}
      return next;
    });
  }

  const sorted = React.useMemo(() => [...DEPTS].sort((a,b)=>{
    const aF = favs.includes(a.id)?0:1, bF = favs.includes(b.id)?0:1;
    if(aF!==bF) return aF-bF;
    return a.live===b.live?0:a.live?-1:1;
  }),[favs]);

  const deskPages = Math.ceil(sorted.length / DESK_PER);

  function mobileGo(dir: 1|-1) {
    if(animating) return;
    const next = mobileIdx + dir;
    if(next < 0 || next >= sorted.length) return;
    setAnimating(true);
    setMobileIdx(next);
    setTimeout(()=>setAnimating(false), 420);
  }

  function onTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0].clientX; }
  function onTouchMove(e: React.TouchEvent)  { touchEnd.current   = e.touches[0].clientX; }
  function onTouchEnd()  {
    const diff = touchStart.current - touchEnd.current;
    if(Math.abs(diff) > 45) mobileGo(diff > 0 ? 1 : -1);
  }

  // Mobile card transform based on offset from current
  function mobileTransform(offset: number): React.CSSProperties {
    if(offset === 0)  return { transform:'translateX(-50%) scale(1)',    opacity:1,    zIndex:10, filter:'none' };
    if(offset === -1) return { transform:'translateX(-132%) scale(0.78)', opacity:0.55, zIndex:5,  filter:'brightness(0.6)' };
    if(offset === 1)  return { transform:'translateX(32%) scale(0.78)',   opacity:0.55, zIndex:5,  filter:'brightness(0.6)' };
    const dir = offset < 0 ? -1 : 1;
    return { transform:`translateX(${dir < 0 ? '-200%' : '200%'}) scale(0.6)`, opacity:0, zIndex:1, filter:'brightness(0.4)' };
  }

  const CardContent = React.useCallback(({ dept, small=false }: { dept: typeof DEPTS[0]; small?: boolean }) => {
    const isFav = favs.includes(dept.id);
    return (
      <div style={{
        height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap: small ? 6 : 10, padding: small ? '12px 8px' : '20px 14px',
        position:'relative', borderRadius:18,
        background:'rgba(8,14,36,0.55)',
        backdropFilter:'blur(24px) saturate(180%)',
        WebkitBackdropFilter:'blur(24px) saturate(180%)',
        border:`1px solid ${isFav ? dept.accent+'50' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: dept.live && !small
          ? `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${dept.accent}20, inset 0 1px 0 rgba(255,255,255,0.12)`
          : '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        overflow:'hidden',
      }}>
        {/* Top shimmer */}
        <div style={{position:'absolute',top:0,left:'15%',right:'15%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.6) 50%,transparent)',pointerEvents:'none'}}/>

        {/* Bottom glow for live */}
        {dept.live && <div style={{position:'absolute',bottom:-8,left:'15%',right:'15%',height:36,background:dept.accent,filter:'blur(18px)',opacity:0.18,borderRadius:'50%',pointerEvents:'none'}}/>}

        {/* Fav star */}
        {!small && (
          <button onClick={e=>toggleFav(dept.id, e)}
            style={{position:'absolute',top:9,right:9,width:26,height:26,borderRadius:'50%',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',backdropFilter:'blur(6px)',zIndex:5}}>
            <svg viewBox="0 0 24 24" fill={isFav?'#fbbf24':'none'} stroke={isFav?'#fbbf24':'rgba(255,255,255,0.4)'} strokeWidth={2} style={{width:12,height:12}}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        )}

        {/* Icon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/icon-${dept.id}.svg`} alt={dept.label}
          style={{width: small?32:40, height: small?32:40, objectFit:'contain',
            filter: dept.live ? ACTIVE_FILTER : 'brightness(0) invert(1)',
            opacity: dept.live ? 1 : 0.3, flexShrink:0}}/>

        {/* Label */}
        <p style={{fontSize: small?9:11, fontWeight:800, letterSpacing:'0.1em',
          color: dept.live?'rgba(255,255,255,0.95)':'rgba(255,255,255,0.3)',
          textAlign:'center', lineHeight:1.2}}>
          {dept.label}
        </p>

        {/* Sub lines */}
        {!small && dept.lines.map((l,i)=>(
          <p key={i} style={{fontSize:9,color:'rgba(255,255,255,0.28)',textAlign:'center',lineHeight:1.5,letterSpacing:'0.02em'}}>{l}</p>
        ))}

        {/* Arrow / lock */}
        {dept.live ? (
          <div style={{width: small?24:30, height: small?24:30, borderRadius:'50%', background:'rgba(255,255,255,0.1)',
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width: small?10:12, height: small?10:12}}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        ) : (
          <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} style={{width:10,height:10}}>
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        )}
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favs]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}body,html{overflow:hidden;}
        .anton{font-family:'Anton',Impact,sans-serif;}
        body{font-family:'Inter',system-ui,sans-serif;}
        .dot{border:none;border-radius:50%;cursor:pointer;transition:all 0.25s ease;padding:0;}
        .nav-arr{width:34px;height:34px;border-radius:50%;background:rgba(8,14,40,0.75);border:1px solid rgba(255,255,255,0.14);
          display:flex;align-items:center;justify-content:center;cursor:pointer;
          backdrop-filter:blur(10px);transition:all 0.2s;color:white;}
        .nav-arr:hover:not(:disabled){background:rgba(8,14,40,0.95);border-color:rgba(255,255,255,0.35);}
        .nav-arr:disabled{opacity:0.2;cursor:default;}
        .desk-card{transition:transform 0.3s cubic-bezier(0.34,1.4,0.64,1),box-shadow 0.3s ease,border-color 0.3s ease;border-radius:18px;overflow:hidden;}
        .desk-card.live:hover{transform:translateY(-5px) scale(1.03);}
        @media(max-width:679px){.desk-only{display:none!important;}.mob-only{display:flex!important;}}
        @media(min-width:680px){.mob-only{display:none!important;}.desk-only{display:flex!important;}}
      `}</style>

      <main style={{height:'100dvh',background:'#040810',color:'white',display:'flex',flexDirection:'column',overflow:'hidden',position:'relative'}}>

        {/* ── BACKGROUND ── */}
        {/* Desktop: 4 panel */}
        <div className="desk-only" style={{position:'absolute',inset:0,zIndex:0,display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
          {PHOTOS.map((src,i)=>(
            <div key={i} style={{position:'relative',overflow:'hidden'}}>
              <Image src={src} alt="" fill style={{objectFit:'cover',objectPosition:'center',filter:'saturate(0.6) brightness(0.55)'}} priority={i===0}/>
              {i>0&&<div style={{position:'absolute',inset:'0 auto 0 0',width:1,background:'rgba(255,255,255,0.05)'}}/>}
            </div>
          ))}
        </div>
        {/* Mobile: cycling */}
        <div className="mob-only" style={{position:'absolute',inset:0,zIndex:0,display:'block'}}>
          {PHOTOS.map((src,i)=>(
            <div key={i} style={{position:'absolute',inset:0,transition:'opacity 1.2s',opacity:mounted&&i===photo?1:0}}>
              <Image src={src} alt="" fill style={{objectFit:'cover',objectPosition:'center 20%',filter:'saturate(0.6) brightness(0.55)'}} priority={i===0}/>
            </div>
          ))}
        </div>
        <div style={{position:'absolute',inset:0,zIndex:1,background:'linear-gradient(to bottom,rgba(4,8,16,0.75) 0%,rgba(4,8,16,0.08) 40%,rgba(4,8,16,0.75) 100%)',pointerEvents:'none'}}/>

        {/* ── HERO ── */}
        <div style={{position:'relative',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'18px 20px 10px',flexShrink:0,
          opacity:mounted?1:0,transform:mounted?'translateY(0)':'translateY(10px)',transition:'all 0.7s ease'}}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={58} height={58}
            style={{objectFit:'contain',filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.7))',marginBottom:8}} priority/>
          <p style={{fontSize:11,fontWeight:400,letterSpacing:'0.22em',color:'rgba(255,255,255,0.75)',marginBottom:2,textAlign:'center'}}>ST BENEDICT&apos;S COLLEGE</p>
          <p style={{fontSize:8,letterSpacing:'0.18em',color:'rgba(255,255,255,0.28)',marginBottom:8,textAlign:'center'}}>EST. 1958 · BEDFORDVIEW</p>
          <h1 className="anton" style={{fontSize:'clamp(2.2rem,6.5vw,4.5rem)',lineHeight:1,textAlign:'center',letterSpacing:'0.03em'}}>
            <span style={{display:'block',color:'white'}}>DRIVEN BY</span>
            <span style={{display:'block',color:'#38bdf8',textShadow:'0 0 40px rgba(56,189,248,0.3)'}}>EXCELLENCE</span>
          </h1>
          <div style={{width:44,height:2,background:'linear-gradient(90deg,transparent,rgba(56,189,248,0.7),transparent)',margin:'6px auto 5px'}}/>
          <p style={{fontSize:11,color:'rgba(255,255,255,0.35)',textAlign:'center',letterSpacing:'0.01em'}}>A unified performance platform for athletes, coaches and teams.</p>
        </div>

        {/* ── DESKTOP CAROUSEL ── */}
        <div className="desk-only" style={{position:'relative',zIndex:10,flex:1,minHeight:0,flexDirection:'column',padding:'0 0 6px'}}>
          <div style={{position:'relative',flex:1,minHeight:0,display:'flex',alignItems:'stretch'}}>
            {/* Arrows */}
            <button className="nav-arr" onClick={()=>setDeskPage(p=>Math.max(0,p-1))} disabled={deskPage===0}
              style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',zIndex:20}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{width:13,height:13}}><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            {/* Cards */}
            <div style={{flex:1,padding:'8px 48px',display:'grid',gridTemplateColumns:`repeat(${DESK_PER},1fr)`,gap:10}}>
              {sorted.slice(deskPage*DESK_PER,(deskPage+1)*DESK_PER).map(dept=>(
                dept.live
                  ? <Link key={dept.id} href={dept.href} style={{display:'block',textDecoration:'none'}} className={`desk-card live`}>
                      <CardContent dept={dept}/>
                    </Link>
                  : <div key={dept.id} className="desk-card" style={{opacity:0.5}}>
                      <CardContent dept={dept}/>
                    </div>
              ))}
              {/* Fill empty slots */}
              {Array.from({length: DESK_PER - sorted.slice(deskPage*DESK_PER,(deskPage+1)*DESK_PER).length}).map((_,i)=>(
                <div key={`e${i}`}/>
              ))}
            </div>
            <button className="nav-arr" onClick={()=>setDeskPage(p=>Math.min(deskPages-1,p+1))} disabled={deskPage>=deskPages-1}
              style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',zIndex:20}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{width:13,height:13}}><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          {/* Dots */}
          <div style={{display:'flex',justifyContent:'center',gap:6,paddingBottom:4}}>
            {Array.from({length:deskPages}).map((_,i)=>(
              <button key={i} className="dot" onClick={()=>setDeskPage(i)}
                style={{background:i===deskPage?'#38bdf8':'rgba(255,255,255,0.2)',width:i===deskPage?18:6,height:6}}/>
            ))}
          </div>
        </div>

        {/* ── MOBILE 3D CAROUSEL ── */}
        <div className="mob-only" style={{position:'relative',zIndex:10,flex:1,minHeight:0,flexDirection:'column',padding:'4px 0 6px'}}>
          {/* 3D card stage */}
          <div style={{position:'relative',flex:1,minHeight:0,overflow:'hidden'}}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

            {sorted.map((dept, idx)=>{
              const offset = idx - mobileIdx;
              if(Math.abs(offset) > 2) return null;
              const ts = mobileTransform(offset);
              const inner = (
                <div style={{
                  position:'absolute', left:'50%', top:8, bottom:8,
                  width:'72%',
                  ...ts,
                  transition:'transform 0.42s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.42s ease, filter 0.42s ease',
                  pointerEvents: offset===0?'auto':'none',
                }}>
                  <CardContent dept={dept} small={Math.abs(offset)>0}/>
                </div>
              );
              return dept.live && offset===0
                ? <Link key={dept.id} href={dept.href} style={{position:'absolute',inset:0,display:'block',textDecoration:'none'}}>{inner}</Link>
                : <div key={dept.id} onClick={()=>{ if(offset!==0) mobileGo(offset>0?1:-1); }}
                    style={{position:'absolute',inset:0,cursor:offset!==0?'pointer':'default'}}>{inner}</div>;
            })}
          </div>

          {/* Dots + index */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,paddingBottom:4}}>
            <div style={{display:'flex',gap:5}}>
              {sorted.map((_,i)=>(
                <button key={i} className="dot" onClick={()=>setMobileIdx(i)}
                  style={{background:i===mobileIdx?'#38bdf8':'rgba(255,255,255,0.18)',width:i===mobileIdx?16:5,height:5}}/>
              ))}
            </div>
            <p style={{fontSize:9,color:'rgba(255,255,255,0.25)',letterSpacing:'0.06em'}}>
              {mobileIdx+1} / {sorted.length} {favs.length>0&&`· ${favs.length} favourite${favs.length>1?'s':''}`}
            </p>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{position:'relative',zIndex:10,textAlign:'center',padding:'2px 16px 8px',flexShrink:0}}>
          <p style={{fontSize:8,fontWeight:700,letterSpacing:'0.4em',color:'rgba(56,189,248,0.35)',marginBottom:2}}>VERITAS IN CARITATE</p>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'3px 8px',fontSize:8,color:'rgba(255,255,255,0.15)'}}>
            <span>KINETIQ Sport · Altus (Pty) Ltd · Reg. 2026/424230/07</span>
            <span>·</span>
            <Link href="/privacy" style={{color:'inherit'}}>Privacy</Link>
            <span>·</span>
            <Link href="/terms" style={{color:'inherit'}}>Terms</Link>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

      </main>
    </>
  );
}