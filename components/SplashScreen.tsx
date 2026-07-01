'use client';
import * as React from 'react';

export default function SplashScreen() {
  const [phase, setPhase] = React.useState<0|1|2|3|4>(0);

  React.useEffect(() => {
    if (sessionStorage.getItem('altus_splash_v2')) return;
    sessionStorage.setItem('altus_splash_v2', '1');
    setPhase(1);
    const t2 = setTimeout(() => setPhase(2), 150);
    const t3 = setTimeout(() => setPhase(3), 700);
    const t4 = setTimeout(() => setPhase(4), 2200);
    const t5 = setTimeout(() => setPhase(0), 3000);
    return () => { [t2,t3,t4,t5].forEach(clearTimeout); };
  }, []);

  if (phase === 0) return null;

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:9999,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      background:'#070c1a',
      opacity: phase === 4 ? 0 : 1,
      transition: phase === 4 ? 'opacity 0.8s cubic-bezier(0.4,0,0.2,1)' : 'opacity 0.3s ease',
      pointerEvents:'none',overflow:'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;700;800&display=swap');
        @keyframes glow-pulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.5;transform:scale(1.1)}}
        @keyframes logo-in{0%{opacity:0;transform:scale(.78) translateY(10px);filter:blur(10px)}70%{filter:blur(0)}100%{opacity:1;transform:scale(1) translateY(0);filter:blur(0)}}
        @keyframes shimmer{0%{transform:translateX(-150%) skewX(-15deg)}100%{transform:translateX(500%) skewX(-15deg)}}
        @keyframes line-grow{0%{transform:scaleX(0);opacity:0}100%{transform:scaleX(1);opacity:1}}
        @keyframes text-up{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes dot-beat{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}
        @keyframes ring-in{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}
      `}</style>

      {/* Subtle grid */}
      <div style={{
        position:'absolute',inset:0,
        backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)',
        backgroundSize:'56px 56px',
        opacity: phase >= 1 ? 1 : 0, transition:'opacity 1.2s ease',
      }}/>

      {/* Glow */}
      <div style={{
        position:'absolute',width:360,height:360,borderRadius:'50%',
        background:'radial-gradient(ellipse,rgba(37,99,235,0.25) 0%,rgba(6,182,212,0.1) 45%,transparent 72%)',
        animation: phase >= 2 ? 'glow-pulse 2.8s ease-in-out infinite' : 'none',
        opacity: phase >= 2 ? 1 : 0, transition:'opacity 0.8s ease',
      }}/>

      {/* Outer ring */}
      <div style={{
        position:'absolute',width:180,height:180,borderRadius:'50%',
        border:'1px solid rgba(37,99,235,0.18)',
        animation: phase >= 2 ? 'ring-in 0.8s ease both' : 'none',
        opacity: phase >= 2 ? 1 : 0,
      }}/>
      <div style={{
        position:'absolute',width:220,height:220,borderRadius:'50%',
        border:'1px solid rgba(37,99,235,0.08)',
        animation: phase >= 2 ? 'ring-in 0.8s ease 0.1s both' : 'none',
        opacity: phase >= 2 ? 1 : 0,
      }}/>

      {/* Logo */}
      <div style={{
        position:'relative',width:120,height:120,marginBottom:28,borderRadius:26,
        overflow:'hidden',
        animation: phase >= 2 ? 'logo-in 1s cubic-bezier(0.34,1.15,0.64,1) both' : 'none',
        opacity: phase >= 2 ? 1 : 0,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/altus-icon.png" alt="Altus" style={{width:'100%',height:'100%',objectFit:'contain',display:'block'}}/>
        {/* Shimmer sweep */}
        <div style={{
          position:'absolute',inset:0,
          background:'linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.22) 50%,transparent 70%)',
          animation: phase >= 2 ? 'shimmer 1.4s ease 0.6s both' : 'none',
        }}/>
      </div>

      {/* Accent line */}
      <div style={{
        width:52,height:1.5,marginBottom:18,transformOrigin:'center',
        background:'linear-gradient(90deg,transparent,#2563eb,#06b6d4,transparent)',
        animation: phase >= 3 ? 'line-grow 0.5s cubic-bezier(0.34,1.4,0.64,1) both' : 'none',
        opacity: phase >= 3 ? 1 : 0,
      }}/>

      {/* Text */}
      <div style={{textAlign:'center',fontFamily:"'Inter',system-ui,sans-serif"}}>
        <p style={{
          fontSize:13,fontWeight:800,letterSpacing:'0.34em',textTransform:'uppercase',
          color:'rgba(255,255,255,0.9)',marginBottom:8,
          animation: phase >= 3 ? 'text-up 0.55s ease both' : 'none',
          opacity: phase >= 3 ? 1 : 0,
        }}>ALTUS PERFORMANCE</p>
        <p style={{
          fontSize:9,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',
          color:'rgba(255,255,255,0.28)',
          animation: phase >= 3 ? 'text-up 0.55s ease 0.15s both' : 'none',
          opacity: phase >= 3 ? 1 : 0,
        }}>St Benedict&apos;s College · Bedfordview</p>
      </div>

      {/* Loading dots */}
      <div style={{
        display:'flex',gap:7,marginTop:44,
        opacity: phase >= 3 ? 1 : 0, transition:'opacity 0.5s ease 0.5s',
      }}>
        {[0,1,2].map(i=>(
          <div key={i} style={{
            width:4,height:4,borderRadius:'50%',
            background: i===1 ? '#2563eb' : 'rgba(255,255,255,0.18)',
            animation: phase >= 3 ? `dot-beat 1.1s ease ${i*0.18}s infinite` : 'none',
          }}/>
        ))}
      </div>
    </div>
  );
}
