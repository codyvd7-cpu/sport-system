'use client';
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const SPORT_CONFIG: Record<string, {
  label: string; color: string; colorDim: string;
  btnGradient: string; btnShadow: string; inputFocus: string;
}> = {
  hockey:   { label:'Hockey',    color:'#3b82f6', colorDim:'rgba(59,130,246,0.15)',  btnGradient:'linear-gradient(135deg,#1d4ed8,#3b82f6)', btnShadow:'0 8px 32px rgba(59,130,246,0.4)',  inputFocus:'rgba(59,130,246,0.5)' },
  rugby:    { label:'Rugby',     color:'#f87171', colorDim:'rgba(248,113,113,0.15)', btnGradient:'linear-gradient(135deg,#b91c1c,#f87171)', btnShadow:'0 8px 32px rgba(248,113,113,0.4)', inputFocus:'rgba(248,113,113,0.5)' },
  cricket:  { label:'Cricket',   color:'#fbbf24', colorDim:'rgba(251,191,36,0.15)',  btnGradient:'linear-gradient(135deg,#92400e,#fbbf24)', btnShadow:'0 8px 32px rgba(251,191,36,0.4)',  inputFocus:'rgba(251,191,36,0.5)' },
  swimming: { label:'Swimming',  color:'#818cf8', colorDim:'rgba(129,140,248,0.15)', btnGradient:'linear-gradient(135deg,#4338ca,#818cf8)', btnShadow:'0 8px 32px rgba(129,140,248,0.4)', inputFocus:'rgba(129,140,248,0.5)' },
  rowing:   { label:'Rowing',    color:'#34d399', colorDim:'rgba(52,211,153,0.15)',  btnGradient:'linear-gradient(135deg,#065f46,#34d399)', btnShadow:'0 8px 32px rgba(52,211,153,0.4)',  inputFocus:'rgba(52,211,153,0.5)' },
};

function PortalLoginInner() {
  const searchParams = useSearchParams();
  const sport = searchParams.get('sport') ||
    (typeof document !== 'undefined'
      ? document.cookie.split(';').find(c => c.trim().startsWith('portal_sport='))?.split('=')[1]
      : null) || 'hockey';
  const cfg = SPORT_CONFIG[sport] || SPORT_CONFIG.hockey;

  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), sport }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Access denied.'); setLoading(false); return; }
      window.location.href = `/portal?sport=${sport}`;
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

        .portal-card {
          position: relative;
          overflow: hidden;
        }
        .portal-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background: linear-gradient(140deg,
            rgba(255,255,255,0.1) 0%,
            rgba(255,255,255,0.02) 40%,
            transparent 70%
          );
          pointer-events: none;
          z-index: 1;
        }
        .portal-card::after {
          content: '';
          position: absolute;
          top: 0; left: 15%; right: 15%;
          height: 1px;
          background: linear-gradient(90deg,
            transparent,
            rgba(255,255,255,0.6) 40%,
            rgba(255,255,255,0.9) 50%,
            rgba(255,255,255,0.6) 60%,
            transparent
          );
          pointer-events: none;
          z-index: 2;
        }

        .access-btn {
          transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
        }
        .access-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }
        .access-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      <main style={{
        minHeight:'100vh',
        background:'#030b1a',
        display:'flex',
        flexDirection:'column',
        alignItems:'center',
        justifyContent:'center',
        padding:'24px 16px',
        position:'relative',
        overflow:'hidden',
      }}>

        {/* Background glow */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:`radial-gradient(ellipse 70% 60% at 50% 30%, ${cfg.colorDim}, transparent)`,
        }}/>
        <div style={{
          position:'absolute',
          top:'20%', left:'50%',
          transform:'translate(-50%,-50%)',
          width:600, height:400,
          background:`radial-gradient(ellipse, ${cfg.color}08, transparent 70%)`,
          pointerEvents:'none',
        }}/>
        {/* Subtle line texture */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', opacity:0.03,
          backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.8) 48px, rgba(255,255,255,0.8) 49px)`,
        }}/>

        {/* Card */}
        <div className="portal-card" style={{
          position:'relative', zIndex:10,
          width:'100%', maxWidth:480,
          background:'rgba(8,18,48,0.72)',
          backdropFilter:'blur(24px) saturate(180%)',
          WebkitBackdropFilter:'blur(24px) saturate(180%)',
          border:`1px solid rgba(255,255,255,0.1)`,
          borderRadius:24,
          boxShadow:`0 32px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1)`,
          padding:'44px 40px 36px',
        }}>
          {/* Top accent glow on card */}
          <div style={{
            position:'absolute', top:0, left:'10%', right:'10%',
            height:1,
            background:`linear-gradient(90deg, transparent, ${cfg.color}80, ${cfg.color}, ${cfg.color}80, transparent)`,
            zIndex:3,
          }}/>

          {/* Content */}
          <div style={{position:'relative', zIndex:2, textAlign:'center'}}>

            {/* Logo */}
            <div style={{marginBottom:20, display:'flex', justifyContent:'center'}}>
              <Image
                src="/st-benedicts-logo.png"
                alt="St Benedict's College"
                width={72} height={72}
                style={{
                  objectFit:'contain',
                  filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.6))',
                }}
                priority
              />
            </div>

            {/* School name */}
            <p style={{
              fontSize:11, fontWeight:500,
              letterSpacing:'0.22em',
              color:'rgba(255,255,255,0.6)',
              marginBottom:10,
            }}>
              ST BENEDICT&apos;S COLLEGE
            </p>

            {/* Heading */}
            <h1 style={{
              fontSize:32, fontWeight:800,
              letterSpacing:'0.01em',
              lineHeight:1.1,
              marginBottom:12,
            }}>
              <span style={{color:'white'}}>{cfg.label.toUpperCase()} </span>
              <span style={{color:cfg.color}}>PORTAL</span>
            </h1>

            {/* Divider */}
            <div style={{
              width:40, height:2,
              background:`linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
              margin:'0 auto 16px',
            }}/>

            {/* Subtitle */}
            <p style={{
              fontSize:13, fontWeight:400,
              color:'rgba(255,255,255,0.45)',
              marginBottom:28,
              lineHeight:1.5,
            }}>
              Enter the portal access code to continue
            </p>

            {/* Access code label */}
            <p style={{
              fontSize:10, fontWeight:700,
              letterSpacing:'0.2em',
              color:cfg.color,
              textAlign:'left',
              marginBottom:8,
            }}>
              ACCESS CODE
            </p>

            {/* Input */}
            <form onSubmit={handleSubmit}>
              <div style={{
                position:'relative',
                marginBottom:12,
              }}>
                {/* Lock icon */}
                <div style={{
                  position:'absolute', left:16, top:'50%',
                  transform:'translateY(-50%)',
                  pointerEvents:'none',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.8} style={{width:18,height:18}}>
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  type="password"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Enter access code"
                  autoComplete="off"
                  style={{
                    width:'100%',
                    background:'rgba(255,255,255,0.05)',
                    border:`1px solid ${focused ? cfg.color+'80' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius:12,
                    padding:'14px 16px 14px 46px',
                    color:'white',
                    fontSize:14,
                    outline:'none',
                    transition:'border-color 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: focused ? `0 0 0 3px ${cfg.color}20` : 'none',
                    boxSizing:'border-box',
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background:'rgba(239,68,68,0.1)',
                  border:'1px solid rgba(239,68,68,0.25)',
                  borderRadius:10,
                  padding:'10px 14px',
                  fontSize:13,
                  color:'#fca5a5',
                  textAlign:'center',
                  marginBottom:12,
                }}>
                  {error}
                </div>
              )}

              {/* Button */}
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="access-btn"
                style={{
                  width:'100%',
                  background: loading || !code.trim() ? 'rgba(255,255,255,0.08)' : cfg.btnGradient,
                  boxShadow: loading || !code.trim() ? 'none' : cfg.btnShadow,
                  border:'none',
                  borderRadius:12,
                  padding:'15px 24px',
                  color:'white',
                  fontSize:15,
                  fontWeight:700,
                  cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:10,
                  opacity: loading || !code.trim() ? 0.5 : 1,
                  transition:'opacity 0.2s ease',
                  letterSpacing:'0.01em',
                }}
              >
                {loading ? 'Checking...' : (
                  <>
                    Access Portal
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width:16,height:16}}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Back link */}
            <div style={{marginTop:24}}>
              <Link href="/" style={{
                fontSize:13,
                color:'rgba(255,255,255,0.35)',
                textDecoration:'none',
                transition:'color 0.2s ease',
              }}>
                ← Back to Departments
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position:'relative', zIndex:10,
          marginTop:32,
          textAlign:'center',
        }}>
          <p style={{
            fontSize:9, fontWeight:700,
            letterSpacing:'0.45em',
            color:`${cfg.color}60`,
            textTransform:'uppercase',
            marginBottom:8,
          }}>
            Veritas In Caritate
          </p>
          <div style={{
            display:'flex', flexWrap:'wrap',
            justifyContent:'center', gap:'6px 8px',
            fontSize:9,
            color:'rgba(255,255,255,0.2)',
          }}>
            <span>KINETIQ Sport is a product of Altus (Pty) Ltd. Reg. 2026/424230/07</span>
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

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#030b1a'}}/>}>
      <PortalLoginInner />
    </Suspense>
  );
}
