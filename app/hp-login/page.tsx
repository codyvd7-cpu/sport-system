'use client';
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const COLOR = '#10b981';
const COLOR_DIM = 'rgba(16,185,129,0.12)';
const BTN_GRADIENT = 'linear-gradient(135deg,#065f46,#10b981)';
const BTN_SHADOW = '0 8px 32px rgba(16,185,129,0.45)';
const PHOTO = '/sbc-photo-1.jpg';

export default function HPLoginPage() {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/hp/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Access denied.'); setLoading(false); return; }
      window.location.href = '/hp';
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
        .hp-card { position: relative; overflow: hidden; }
        .hp-card::before {
          content: '';
          position: absolute; inset: 0; border-radius: 24px;
          background: linear-gradient(140deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 45%, transparent 70%);
          pointer-events: none; z-index: 1;
        }
        .hp-card::after {
          content: '';
          position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.55) 60%, transparent);
          pointer-events: none; z-index: 2;
        }
        .hp-btn { transition: transform 0.2s ease, filter 0.2s ease; }
        .hp-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .back-link { transition: color 0.2s ease; }
        .back-link:hover { color: rgba(255,255,255,0.6) !important; }
      `}</style>

      <main style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 16px',position:'relative',overflow:'hidden',background:'#020c0a'}}>

        {/* Background photo */}
        <div style={{position:'absolute',inset:0,zIndex:0}}>
          <Image src={PHOTO} alt="" fill className="object-cover object-center"
            style={{filter:'brightness(0.2) saturate(0.4)'}} priority/>
        </div>

        {/* Overlays */}
        <div style={{position:'absolute',inset:0,zIndex:1,background:'linear-gradient(to bottom,rgba(2,12,8,0.65) 0%,rgba(2,12,8,0.4) 50%,rgba(2,12,8,0.85) 100%)'}}/>
        <div style={{position:'absolute',inset:0,zIndex:2,pointerEvents:'none',background:`radial-gradient(ellipse 65% 55% at 50% 42%, ${COLOR_DIM}, transparent)`}}/>

        {/* Card */}
        <div className="hp-card" style={{
          position:'relative',zIndex:10,
          width:'100%',maxWidth:460,
          background:'rgba(4,18,12,0.78)',
          backdropFilter:'blur(28px) saturate(180%)',
          WebkitBackdropFilter:'blur(28px) saturate(180%)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:24,
          boxShadow:`0 40px 90px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)`,
          padding:'44px 40px 36px',
        }}>
          {/* Green top rim */}
          <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:1,background:`linear-gradient(90deg,transparent,${COLOR}90,${COLOR},${COLOR}90,transparent)`,zIndex:3}}/>

          <div style={{position:'relative',zIndex:2,textAlign:'center'}}>

            {/* Logo */}
            <div style={{marginBottom:18,display:'flex',justifyContent:'center'}}>
              <Image src="/st-benedicts-logo.png" alt="St Benedict's College" width={68} height={68}
                style={{objectFit:'contain',filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.7))'}} priority/>
            </div>

            {/* School name */}
            <p style={{fontSize:11,fontWeight:500,letterSpacing:'0.22em',color:'rgba(255,255,255,0.55)',marginBottom:10}}>
              ST BENEDICT&apos;S COLLEGE
            </p>

            {/* Heading */}
            <h1 style={{fontSize:30,fontWeight:800,letterSpacing:'0.01em',lineHeight:1.1,marginBottom:12}}>
              <span style={{color:'white'}}>HIGH PERFORMANCE </span>
              <span style={{color:COLOR}}>ACCESS</span>
            </h1>

            {/* Divider */}
            <div style={{width:36,height:2,background:`linear-gradient(90deg,transparent,${COLOR},transparent)`,margin:'0 auto 14px'}}/>

            {/* Subtitle */}
            <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:28,lineHeight:1.5}}>
              Enter your HP department access code
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.2em',color:COLOR,textAlign:'left',marginBottom:8}}>
                ACCESS CODE
              </p>

              <div style={{position:'relative',marginBottom:12}}>
                <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1.8} style={{width:17,height:17}}>
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  type="password" required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Enter access code"
                  autoComplete="off"
                  style={{
                    width:'100%',boxSizing:'border-box',
                    background:'rgba(255,255,255,0.05)',
                    border:`1px solid ${focused ? COLOR+'80' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius:12,padding:'13px 14px 13px 42px',
                    color:'white',fontSize:14,outline:'none',
                    transition:'border-color 0.2s, box-shadow 0.2s',
                    boxShadow:focused ? `0 0 0 3px ${COLOR}18` : 'none',
                  }}
                />
              </div>

              {error && (
                <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.22)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#fca5a5',textAlign:'center',marginBottom:12}}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !code.trim()} className="hp-btn"
                style={{
                  width:'100%',border:'none',borderRadius:12,padding:'14px 24px',
                  background:loading || !code.trim() ? 'rgba(255,255,255,0.07)' : BTN_GRADIENT,
                  boxShadow:loading || !code.trim() ? 'none' : BTN_SHADOW,
                  color:'white',fontSize:15,fontWeight:700,
                  cursor:loading || !code.trim() ? 'not-allowed' : 'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                  opacity:loading || !code.trim() ? 0.45 : 1,
                  transition:'opacity 0.2s',letterSpacing:'0.01em',
                }}>
                {loading ? 'Checking...' : (
                  <>
                    Access HP Department
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width:15,height:15}}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div style={{marginTop:22}}>
              <Link href="/" className="back-link" style={{fontSize:13,color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>
                ← Back to Departments
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{position:'relative',zIndex:10,marginTop:28,textAlign:'center'}}>
          <p style={{fontSize:9,fontWeight:700,letterSpacing:'0.45em',color:`${COLOR}55`,textTransform:'uppercase',marginBottom:6}}>
            Veritas In Caritate
          </p>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'4px 8px',fontSize:9,color:'rgba(255,255,255,0.18)'}}>
            <span>Altus Performance is a product of Altus (Pty) Ltd. Reg. 2026/424230/07</span>
            <span>·</span>
            <Link href="/privacy" style={{color:'inherit'}}>Privacy</Link>
            <span>·</span>
            <Link href="/terms" style={{color:'inherit'}}>Terms</Link>
            <span>·</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </div>

      </main>
    </>
  );
}
