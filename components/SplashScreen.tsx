'use client';
import * as React from 'react';

export default function SplashScreen() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rafRef    = React.useRef<number>(0);
  const [phase, setPhase] = React.useState(0);
  // 0=hidden 1=particles+emerge 2=hold+pulse 3=text 4=out 5=gone

  React.useEffect(() => {
    if (sessionStorage.getItem('ap_v3')) return;
    sessionStorage.setItem('ap_v3', '1');
    setPhase(1);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => setPhase(3), 2600);
    const t4 = setTimeout(() => setPhase(4), 3800);
    const t5 = setTimeout(() => setPhase(5), 4600);
    return () => [t2,t3,t4,t5].forEach(clearTimeout);
  }, []);

  // Canvas particle engine
  React.useEffect(() => {
    if (phase < 1 || phase === 5) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const CX = W / 2, CY = H / 2 - 30;

    type P = { x:number; y:number; vx:number; vy:number; size:number; alpha:number; col:string; dead:boolean; trail:{x:number;y:number}[] };
    const COLS = ['#1d4ed8','#2563eb','#3b82f6','#06b6d4','#0ea5e9','#7dd3fc'];
    const particles: P[] = [];
    const N = 90;

    for (let i = 0; i < N; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = 180 + Math.random() * 280;
      const cx = CX + Math.cos(angle) * radius;
      const cy = CY + Math.sin(angle) * radius;
      const speed = 1.2 + Math.random() * 2.2;
      const dx = CX - cx, dy = CY - cy;
      const dist = Math.sqrt(dx*dx+dy*dy);
      particles.push({
        x: cx, y: cy,
        vx: (dx/dist)*speed,
        vy: (dy/dist)*speed,
        size: 0.6 + Math.random() * 1.4,
        alpha: 0.4 + Math.random() * 0.6,
        col: COLS[Math.floor(Math.random() * COLS.length)],
        dead: false,
        trail: [],
      });
    }

    let t = 0;
    const draw = () => {
      t++;
      // Fade trail
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, W, H);

      for (const p of particles) {
        if (p.dead) continue;
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 12) p.trail.shift();

        // Move toward center
        const dx = CX - p.x, dy = CY - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 6) { p.dead = true; continue; }

        if (phase <= 2) {
          p.x += p.vx;
          p.y += p.vy;
        } else {
          p.alpha *= 0.92;
        }

        // Trail
        if (p.trail.length > 2) {
          for (let i = 1; i < p.trail.length; i++) {
            const a = (i / p.trail.length) * p.alpha * 0.5;
            ctx.beginPath();
            ctx.moveTo(p.trail[i-1].x, p.trail[i-1].y);
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
            ctx.strokeStyle = p.col;
            ctx.lineWidth = p.size * (i / p.trail.length);
            ctx.globalAlpha = a;
            ctx.stroke();
          }
        }

        // Dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.col;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Blue glow at logo center when particles arrive
      if (t > 40) {
        const alive = particles.filter(p => !p.dead).length;
        const converge = Math.max(0, 1 - alive / N);
        const pulse = phase >= 2 ? (0.5 + 0.5 * Math.sin(t * 0.06)) : converge;
        const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, 80);
        grd.addColorStop(0, `rgba(37,99,235,${0.18 * pulse})`);
        grd.addColorStop(0.5, `rgba(6,182,212,${0.08 * pulse})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.globalAlpha = 1;
        ctx.fillRect(CX - 80, CY - 80, 160, 160);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    // Start with black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  if (phase === 0 || phase === 5) return null;

  const logoBlur   = phase === 1 ? '12px' : '0px';
  const logoScale  = phase === 1 ? 1.05 : 1;
  const logoOpacity= phase === 1 ? 0 : 1;
  const glowSize   = phase >= 2 ? '0 0 40px rgba(37,99,235,0.55), 0 0 80px rgba(37,99,235,0.2)' : 'none';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'#000',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      opacity: phase === 4 ? 0 : 1,
      transition: phase === 4 ? 'opacity 0.85s cubic-bezier(0.4,0,1,1)' : 'none',
      pointerEvents:'none',
    }}>
      <style>{`
        @keyframes emerge {
          0%   { opacity:0; transform:scale(1.06); filter:blur(14px); }
          40%  { filter:blur(4px); }
          100% { opacity:1; transform:scale(1); filter:blur(0px); }
        }
        @keyframes dolly {
          0%   { transform:scale(1.04); }
          100% { transform:scale(1); }
        }
        @keyframes glow-beat {
          0%,100% { filter:drop-shadow(0 0 18px rgba(37,99,235,0.5)) drop-shadow(0 0 40px rgba(37,99,235,0.2)); }
          50%     { filter:drop-shadow(0 0 28px rgba(37,99,235,0.8)) drop-shadow(0 0 60px rgba(6,182,212,0.3)); }
        }
        @keyframes text-rise {
          0%   { opacity:0; transform:translateY(16px) scaleX(0.96); letter-spacing:0.5em; }
          100% { opacity:1; transform:translateY(0) scaleX(1); }
        }
        @keyframes sub-rise {
          0%   { opacity:0; transform:translateY(8px); }
          100% { opacity:0.35; transform:translateY(0); }
        }
        @keyframes line-expand {
          0%   { transform:scaleX(0); opacity:0; }
          100% { transform:scaleX(1); opacity:1; }
        }
      `}</style>

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}/>

      {/* Logo */}
      <div style={{
        position:'relative', zIndex:1,
        width:100, height:100,
        marginBottom:32,
        animation: phase >= 2
          ? `glow-beat 2.2s ease-in-out infinite, dolly 1.2s ease both`
          : phase === 1 ? 'emerge 1.8s cubic-bezier(0.22,1,0.36,1) 0.2s both' : 'none',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/altus-icon.png" alt="Altus"
          style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}/>
      </div>

      {/* Text block */}
      {phase >= 3 && (
        <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
          <div style={{
            width:40, height:1,
            background:'linear-gradient(90deg,transparent,rgba(37,99,235,0.8),transparent)',
            margin:'0 auto 18px',
            transformOrigin:'center',
            animation:'line-expand 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
          }}/>
          <p style={{
            fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif',
            fontSize:12, fontWeight:700,
            letterSpacing:'0.38em',
            color:'rgba(255,255,255,0.88)',
            textTransform:'uppercase',
            animation:'text-rise 0.65s cubic-bezier(0.22,1,0.36,1) both',
            marginBottom:7,
          }}>Altus Performance</p>
          <p style={{
            fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
            fontSize:9, fontWeight:300,
            letterSpacing:'0.22em',
            color:'rgba(255,255,255,0.35)',
            textTransform:'uppercase',
            animation:'sub-rise 0.6s ease 0.2s both',
          }}>St Benedict&apos;s College</p>
        </div>
      )}
    </div>
  );
}
