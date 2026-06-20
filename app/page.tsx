'use client';
import Link from 'next/link';
import * as React from 'react';
import Image from 'next/image';

const PHOTOS = ['/sbc-photo-4.jpg', '/sbc-photo-1.jpg', '/sbc-photo-3.jpg', '/sbc-photo-2.jpg'];

const DEPTS = [
  { id:'hockey',    label:'HOCKEY',     sub:['Teams · Fixtures · Results','Weekly Schedule'],  href:'/portal-login?sport=hockey', live:true,  accent:'#38bdf8' },
  { id:'hp',        label:'HP CLASSES', sub:['Testing · Trends','Athletes & Attendance'],        href:'/hp-login',                  live:true,  accent:'#10b981' },
  { id:'rugby',     label:'RUGBY',      sub:['Teams · Fixtures · Results','Weekly Schedule'],  href:'/portal-login?sport=rugby',  live:true,  accent:'#f87171' },
  { id:'cricket',   label:'CRICKET',    sub:['Coming Soon'],                                    href:'#',                          live:false, accent:'#fbbf24' },
  { id:'swimming',  label:'SWIMMING',   sub:['Coming Soon'],                                    href:'#',                          live:false, accent:'#818cf8' },
  { id:'rowing',    label:'ROWING',     sub:['Coming Soon'],                                    href:'#',                          live:false, accent:'#34d399' },
  { id:'athletics', label:'ATHLETICS',  sub:['Coming Soon'],                                    href:'#',                          live:false, accent:'#fb923c' },
  { id:'waterpolo', label:'WATER POLO', sub:['Coming Soon'],                                    href:'#',                          live:false, accent:'#38bdf8' },
  { id:'soccer',    label:'SOCCER',     sub:['Coming Soon'],                                    href:'#',                          live:false, accent:'#22c55e' },
  { id:'golf',      label:'GOLF',       sub:['Coming Soon'],                                    href:'#',                          live:false, accent:'#fbbf24' },
];

// ── Inline sport icons (white SVGs) ──────────────────────────────────────────
export default function LandingPage() {
  const [mounted,    setMounted]    = React.useState(false);
  const [activePhoto,setActivePhoto]= React.useState(0);
  const [favourites, setFavourites] = React.useState<string[]>([]);
  const [scrollPage, setScrollPage] = React.useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = React.useState(4);

  React.useEffect(() => {
    setMounted(true);
    // Load favourites from localStorage
    try { const s = localStorage.getItem('ks_fav'); if (s) setFavourites(JSON.parse(s)); } catch {}
    // Set perPage based on width
    const update = () => setPerPage(window.innerWidth < 640 ? 2 : window.innerWidth < 900 ? 3 : 4);
    update();
    window.addEventListener('resize', update);
    const t = setInterval(() => setActivePhoto(p => (p+1) % PHOTOS.length), 5000);
    return () => { clearInterval(t); window.removeEventListener('resize', update); };
  }, []);

  function toggleFav(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setFavourites(prev => {
      const next = prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id];
      try { localStorage.setItem('ks_fav', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Sort: favourites first, then live, then locked
  const sorted = React.useMemo(() => {
    return [...DEPTS].sort((a, b) => {
      const aF = favourites.includes(a.id) ? 0 : 1;
      const bF = favourites.includes(b.id) ? 0 : 1;
      if (aF !== bF) return aF - bF;
      if (a.live !== b.live) return a.live ? -1 : 1;
      return 0;
    });
  }, [favourites]);

  const totalPages = Math.ceil(sorted.length / perPage);

  function scrollTo(page: number) {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: page * el.clientWidth, behavior:'smooth' });
    setScrollPage(page);
  }

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    setScrollPage(page);
  }

  const ACTIVE_FILTER = 'brightness(0) saturate(100%) invert(75%) sepia(50%) saturate(500%) hue-rotate(185deg) brightness(115%)';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .anton{font-family:'Anton',Impact,sans-serif;}
        body{font-family:'Inter',system-ui,sans-serif;overflow:hidden;}
        .card{
          transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
                     box-shadow 0.3s ease,
                     border-color 0.3s ease;
          position:relative;
          border-radius:18px;
          overflow:hidden;
          cursor:pointer;
        }
        .card::before{
          content:'';position:absolute;inset:0;border-radius:18px;
          background:linear-gradient(140deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.03) 40%,transparent 70%);
          pointer-events:none;z-index:1;
        }
        .card::after{
          content:'';position:absolute;top:0;left:10%;right:10%;height:1px;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.7) 50%,transparent);
          pointer-events:none;z-index:2;
        }
        .card.live:hover{transform:translateY(-4px) scale(1.025);border-color:var(--accent)!important;box-shadow:0 20px 50px rgba(0,0,0,0.5),0 0 30px var(--glow);}
        .card.locked{cursor:default;opacity:0.5;}
        .fav-btn{position:absolute;top:10px;right:10px;z-index:10;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.15);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;backdrop-filter:blur(8px);}
        .fav-btn:hover{background:rgba(0,0,0,0.5);transform:scale(1.1);}
        .dot{width:6px;height:6px;border-radius:50%;border:none;cursor:pointer;transition:all 0.2s;padding:0;}
        .carousel::-webkit-scrollbar{display:none;}
        .carousel{scrollbar-width:none;-ms-overflow-style:none;}
        .nav-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:20;width:36px;height:36px;border-radius:50%;background:rgba(10,15,40,0.75);border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(10px);transition:all 0.2s;color:white;}
        .nav-arrow:hover{background:rgba(10,15,40,0.95);border-color:rgba(255,255,255,0.4);}
        .nav-arrow:disabled{opacity:0.25;cursor:default;}
        @media(max-width:640px){
          .hero-title{font-size:clamp(2.2rem,11vw,3.2rem)!important;}
          .hero-sub{font-size:11px!important;}
          .hero-logo{width:52px!important;height:52px!important;}
        }
      `}</style>

      <main style={{ height:'100dvh', background:'#040810', color:'white', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

        {/* ── BACKGROUND ── */}
        <div style={{ position:'absolute', inset:0, zIndex:0, display:'grid', gridTemplateColumns:'repeat(4,1fr)' }} className="hidden-mobile">
          <style>{`.hidden-mobile{display:none!important;}@media(min-width:640px){.hidden-mobile{display:grid!important;}}`}</style>
          {PHOTOS.map((src, i) => (
            <div key={i} style={{ position:'relative', overflow:'hidden' }}>
              <Image src={src} alt="" fill style={{ objectFit:'cover', objectPosition:'center', filter:'saturate(0.6) brightness(0.55)' }} priority={i===0}/>
              {i>0 && <div style={{ position:'absolute', inset:'0 auto 0 0', width:1, background:'rgba(255,255,255,0.06)' }}/>}
            </div>
          ))}
        </div>
        {/* Mobile single cycling photo */}
        <div style={{ position:'absolute', inset:0, zIndex:0 }} className="show-mobile">
          <style>{`.show-mobile{display:none!important;}@media(max-width:639px){.show-mobile{display:block!important;}}`}</style>
          {PHOTOS.map((src, i) => (
            <div key={i} style={{ position:'absolute', inset:0, transition:'opacity 1.2s ease', opacity: mounted && i===activePhoto ? 1 : 0 }}>
              <Image src={src} alt="" fill style={{ objectFit:'cover', objectPosition:'center 20%', filter:'saturate(0.6) brightness(0.55)' }} priority={i===0}/>
            </div>
          ))}
        </div>
        {/* Overlays */}
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'linear-gradient(to bottom, rgba(4,8,16,0.72) 0%, rgba(4,8,16,0.1) 35%, rgba(4,8,16,0.72) 100%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', inset:0, zIndex:1, background:'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(4,8,16,0.2), transparent)', pointerEvents:'none' }}/>

        {/* ── HERO ── */}
        <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 20px 12px', flexShrink:0 }}>
          <div style={{ opacity: mounted?1:0, transform: mounted?'translateY(0)':'translateY(12px)', transition:'all 0.7s ease', display:'flex', flexDirection:'column', alignItems:'center' }}>
            <Image src="/st-benedicts-logo.png" alt="SBC" width={68} height={68} className="hero-logo"
              style={{ objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.7))', marginBottom:10 }} priority/>
            <p style={{ fontSize:12, fontWeight:400, letterSpacing:'0.22em', color:'rgba(255,255,255,0.8)', marginBottom:2, textAlign:'center' }}>ST BENEDICT&apos;S COLLEGE</p>
            <p style={{ fontSize:9, letterSpacing:'0.18em', color:'rgba(255,255,255,0.3)', marginBottom:10, textAlign:'center' }}>EST. 1958 · BEDFORDVIEW</p>
            <h1 className="anton hero-title" style={{ fontSize:'clamp(2.8rem,7vw,5rem)', lineHeight:1, textAlign:'center', letterSpacing:'0.03em' }}>
              <span style={{ display:'block', color:'white' }}>DRIVEN BY</span>
              <span style={{ display:'block', color:'#38bdf8', textShadow:'0 0 40px rgba(56,189,248,0.35)' }}>EXCELLENCE</span>
            </h1>
            <div style={{ width:48, height:2, background:'linear-gradient(90deg,transparent,rgba(56,189,248,0.8),transparent)', margin:'8px auto 6px' }}/>
            <p className="hero-sub" style={{ fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center', letterSpacing:'0.01em' }}>
              A unified performance platform for athletes, coaches and teams.
            </p>
          </div>
        </div>

        {/* ── CAROUSEL ── */}
        <div style={{ position:'relative', zIndex:10, flex:1, minHeight:0, display:'flex', flexDirection:'column', padding:'0 0 8px' }}>

          {/* Favourites hint */}
          {mounted && favourites.length === 0 && (
            <p style={{ textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.25)', marginBottom:6, letterSpacing:'0.05em' }}>
              ★ Tap the star on any card to add it to your favourites
            </p>
          )}

          {/* Cards container */}
          <div style={{ position:'relative', flex:1, minHeight:0 }}>
            {/* Left arrow */}
            <button className="nav-arrow" onClick={() => scrollTo(Math.max(0, scrollPage-1))}
              disabled={scrollPage===0} style={{ left:8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{width:14,height:14}}><path d="M15 18l-6-6 6-6"/></svg>
            </button>

            {/* Scrollable carousel */}
            <div ref={carouselRef} className="carousel"
              onScroll={handleCarouselScroll}
              style={{ display:'flex', overflowX:'auto', scrollSnapType:'x mandatory', height:'100%', gap:10, padding:'0 48px', scrollBehavior:'smooth' }}>
              {/* Group cards into pages */}
              {Array.from({ length: totalPages }, (_, pageIdx) => (
                <div key={pageIdx} style={{ display:'flex', gap:10, flexShrink:0, width:'100%', scrollSnapAlign:'start' }}>
                  {sorted.slice(pageIdx*perPage, (pageIdx+1)*perPage).map(dept => {
                    const isFav = favourites.includes(dept.id);
                    const card = (
                      <div key={dept.id} className={`card ${dept.live?'live':'locked'}`}
                        style={{
                          flex:1,
                          '--accent': dept.accent,
                          '--glow': dept.accent+'55',
                          background:'rgba(8,16,40,0.45)',
                          backdropFilter:'blur(20px) saturate(180%)',
                          WebkitBackdropFilter:'blur(20px) saturate(180%)',
                          border:`1px solid ${isFav ? dept.accent+'50' : 'rgba(255,255,255,0.1)'}`,
                          boxShadow: isFav ? `0 0 0 1px ${dept.accent}30, 0 4px 20px rgba(0,0,0,0.3)` : '0 4px 20px rgba(0,0,0,0.2)',
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                          gap:8, padding:'16px 10px', minWidth:0,
                        } as React.CSSProperties}>

                        {/* Favourite button */}
                        <button className="fav-btn" onClick={e => toggleFav(dept.id, e)}
                          title={isFav ? 'Remove from favourites' : 'Add to favourites'}>
                          <svg viewBox="0 0 24 24" fill={isFav?'#fbbf24':'none'} stroke={isFav?'#fbbf24':'rgba(255,255,255,0.5)'} strokeWidth={2} style={{width:13,height:13}}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        </button>

                        {/* Icon */}
                        <div style={{ position:'relative', zIndex:3 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/icon-${dept.id === 'hp' ? 'hp' : dept.id}.svg`} alt={dept.label}
                            style={{
                              width:48, height:48, objectFit:'contain',
                              filter: dept.live ? ACTIVE_FILTER : 'brightness(0) invert(1)',
                              opacity: dept.live ? 1 : 0.35,
                            }}/>
                        </div>

                        {/* Label */}
                        <div style={{ textAlign:'center', position:'relative', zIndex:3 }}>
                          <p style={{ fontSize:11, fontWeight:800, letterSpacing:'0.1em', color: dept.live ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)', marginBottom:4 }}>
                            {dept.label}
                          </p>
                          {dept.sub.map((line, i) => (
                            <p key={i} style={{ fontSize:9, color:'rgba(255,255,255,0.28)', lineHeight:1.5, letterSpacing:'0.02em' }}>{line}</p>
                          ))}
                        </div>

                        {/* Arrow / Lock */}
                        <div style={{ position:'relative', zIndex:3 }}>
                          {dept.live ? (
                            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.1)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width:12,height:12}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                          ) : (
                            <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} style={{width:11,height:11}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </div>
                          )}
                        </div>

                        {/* Bottom glow for live cards */}
                        {dept.live && (
                          <div style={{ position:'absolute', bottom:-6, left:'20%', right:'20%', height:40, background:dept.accent, filter:'blur(20px)', opacity:0.18, borderRadius:'50%', zIndex:0, pointerEvents:'none' }}/>
                        )}
                      </div>
                    );

                    return dept.live ? (
                      <Link key={dept.id} href={dept.href} style={{ flex:1, display:'flex', minWidth:0, textDecoration:'none' }}>
                        {card}
                      </Link>
                    ) : (
                      <div key={dept.id} style={{ flex:1, minWidth:0 }}>{card}</div>
                    );
                  })}

                  {/* Fill empty slots on last page */}
                  {sorted.slice(pageIdx*perPage, (pageIdx+1)*perPage).length < perPage && 
                    Array.from({ length: perPage - sorted.slice(pageIdx*perPage, (pageIdx+1)*perPage).length }).map((_, i) => (
                      <div key={`empty-${i}`} style={{ flex:1 }}/>
                    ))
                  }
                </div>
              ))}
            </div>

            {/* Right arrow */}
            <button className="nav-arrow" onClick={() => scrollTo(Math.min(totalPages-1, scrollPage+1))}
              disabled={scrollPage >= totalPages-1} style={{ right:8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{width:14,height:14}}><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          {/* Dots */}
          <div style={{ display:'flex', justifyContent:'center', gap:6, paddingTop:8, paddingBottom:2 }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} className="dot" onClick={() => scrollTo(i)}
                style={{ background: i===scrollPage ? '#38bdf8' : 'rgba(255,255,255,0.2)', width: i===scrollPage ? 18 : 6 }}/>
            ))}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ position:'relative', zIndex:10, textAlign:'center', padding:'4px 16px 10px', flexShrink:0 }}>
          <p style={{ fontSize:8, fontWeight:700, letterSpacing:'0.4em', color:'rgba(56,189,248,0.4)', marginBottom:3 }}>VERITAS IN CARITATE</p>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'4px 8px', fontSize:8, color:'rgba(255,255,255,0.18)' }}>
            <span>KINETIQ Sport · Altus (Pty) Ltd · Reg. 2026/424230/07</span>
            <span>·</span>
            <Link href="/privacy" style={{ color:'inherit' }}>Privacy</Link>
            <span>·</span>
            <Link href="/terms" style={{ color:'inherit' }}>Terms</Link>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

      </main>
    </>
  );
}