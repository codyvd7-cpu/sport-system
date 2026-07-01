'use client';
import * as React from 'react';

// Easing functions
const easeOut  = (t:number) => 1 - Math.pow(1-t, 3);
const easeIn   = (t:number) => t * t * t;
const easeInOut= (t:number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
const clamp    = (v:number, mn=0, mx=1) => Math.min(mx, Math.max(mn, v));
const inv      = (t:number, a:number, b:number) => clamp((t-a)/(b-a));

export default function SplashScreen() {
  const wrapRef   = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const logoRef   = React.useRef<HTMLDivElement>(null);
  const textRef   = React.useRef<HTMLDivElement>(null);
  const lineRef   = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    if (sessionStorage.getItem('ap_v4')) return;
    sessionStorage.setItem('ap_v4', '1');
    setActive(true);
  }, []);

  React.useEffect(() => {
    if (!active) return;
    const wrap   = wrapRef.current;
    const canvas = canvasRef.current;
    const logoEl = logoRef.current;
    const textEl = textRef.current;
    const lineEl = lineRef.current;
    if (!wrap || !canvas || !logoEl || !textEl || !lineEl) return;

    // ── Canvas setup ──────────────────────────────────────────────────────────
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W   = window.innerWidth;
    const H   = window.innerHeight;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);

    const CX = W / 2;
    const CY = H / 2 - 20;

    // ── Particles ─────────────────────────────────────────────────────────────
    const COLS = ['#1d4ed8','#2563eb','#3b82f6','#0ea5e9','#06b6d4','#38bdf8'];
    type Particle = { sx:number; sy:number; x:number; y:number; vx:number; vy:number; size:number; col:string; born:number; trail:{x:number;y:number}[] };
    const particles: Particle[] = [];
    const N = 80;

    for (let i = 0; i < N; i++) {
      const angle  = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = 200 + Math.random() * 320;
      const sx     = CX + Math.cos(angle) * radius;
      const sy     = CY + Math.sin(angle) * radius;
      const dx = CX - sx, dy = CY - sy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const speed = 2.5 + Math.random() * 3;
      particles.push({
        sx, sy, x: sx, y: sy,
        vx: (dx/dist) * speed,
        vy: (dy/dist) * speed,
        size: 0.8 + Math.random() * 1.6,
        col: COLS[Math.floor(Math.random() * COLS.length)],
        born: 0.1 + (i / N) * 0.8,   // staggered birth time (seconds)
        trail: [],
      });
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    const START = performance.now();
    // Timeline (seconds):
    const TL = { ptcEnd:2.0, logoIn:0.3, logoFull:2.2, textIn:2.5, textFull:3.2, fadeStart:3.8, end:4.6 };
    let rafId = 0;

    const frame = (now: number) => {
      const t = (now - START) / 1000;

      // ── Canvas ──
      // Dark fade trail for particle streaks
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, W, H);

      // Particles
      for (const p of particles) {
        if (t < p.born) continue;
        const age = t - p.born;

        if (t < TL.ptcEnd) {
          // Move toward center
          const dx = CX - p.x, dy = CY - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 3) {
            p.x += p.vx;
            p.y += p.vy;
          }
        } else {
          // Fade away
          p.size *= 0.96;
        }

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 14) p.trail.shift();

        const fadeIn = clamp(age * 3, 0, 1);
        const fadeOut= t > TL.ptcEnd ? clamp((t - TL.ptcEnd) * 3, 0, 1) : 0;
        const alpha  = fadeIn * (1 - fadeOut) * 0.85;

        // Trail
        for (let i = 1; i < p.trail.length; i++) {
          const progress = i / p.trail.length;
          ctx.beginPath();
          ctx.moveTo(p.trail[i-1].x, p.trail[i-1].y);
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
          ctx.strokeStyle = p.col;
          ctx.lineWidth   = p.size * progress * 0.8;
          ctx.globalAlpha = alpha * progress * 0.6;
          ctx.stroke();
        }

        // Dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.col;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Glow bloom when particles converge
      const convergeProg = clamp(inv(t, 1.2, TL.ptcEnd), 0, 1);
      const holdProg     = clamp(inv(t, TL.ptcEnd, TL.ptcEnd + 0.4), 0, 1);
      const pulseProg    = t > TL.ptcEnd ? 0.15 + 0.12 * Math.sin(t * 4.5) : 0;
      const glowAlpha    = easeOut(convergeProg) * 0.6 + pulseProg;

      if (glowAlpha > 0.01) {
        const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, 90);
        g.addColorStop(0,   `rgba(37,99,235,${glowAlpha * 0.5})`);
        g.addColorStop(0.4, `rgba(6,182,212,${glowAlpha * 0.2})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.globalAlpha = 1;
        ctx.fillRect(CX-90, CY-90, 180, 180);
      }

      // ── Logo (direct DOM) ──
      const logoProgress = easeOut(clamp(inv(t, TL.logoIn, TL.logoFull), 0, 1));
      const blur  = (1 - logoProgress) * 14;
      const scale = 1.06 - 0.06 * logoProgress;
      const glow  = t > TL.logoFull ? 18 + 10 * Math.sin(t * 4) : logoProgress * 18;
      const logoOpacity = easeIn(clamp(inv(t, TL.logoIn, TL.logoIn + 1.2), 0, 1));
      logoEl.style.opacity   = String(logoOpacity);
      logoEl.style.transform = `scale(${scale})`;
      logoEl.style.filter    = `blur(${blur.toFixed(1)}px) drop-shadow(0 0 ${glow.toFixed(0)}px rgba(37,99,235,0.7)) drop-shadow(0 0 ${(glow*2).toFixed(0)}px rgba(37,99,235,0.25))`;

      // ── Text (direct DOM) ──
      const textProgress = easeOut(clamp(inv(t, TL.textIn, TL.textFull), 0, 1));
      const lineProgress = easeOut(clamp(inv(t, TL.textIn, TL.textIn + 0.5), 0, 1));
      lineEl.style.transform = `scaleX(${lineProgress})`;
      lineEl.style.opacity   = String(lineProgress);
      textEl.style.opacity   = String(textProgress);
      textEl.style.transform = `translateY(${(1-textProgress)*14}px)`;

      // ── Wrap fade out ──
      if (t > TL.fadeStart) {
        const fo = clamp(inv(t, TL.fadeStart, TL.end), 0, 1);
        wrap.style.opacity = String(1 - easeIn(fo));
      }

      if (t < TL.end) {
        rafId = requestAnimationFrame(frame);
      } else {
        setActive(false);
      }
    };

    // Init canvas to black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  if (!active) return null;

  return (
    <div ref={wrapRef} style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'#000',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      pointerEvents:'none',
    }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0 }}/>

      {/* Logo */}
      <div ref={logoRef} style={{
        position:'relative', zIndex:1,
        width:110, height:110,
        marginBottom:32,
        opacity:0,
        willChange:'transform,filter,opacity',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/altus-icon.png" alt="Altus"
          style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}/>
      </div>

      {/* Accent line */}
      <div ref={lineRef} style={{
        width:44, height:1.5,
        background:'linear-gradient(90deg,transparent,#3b82f6,#06b6d4,transparent)',
        marginBottom:18,
        transformOrigin:'center',
        opacity:0,
        transform:'scaleX(0)',
        zIndex:1, position:'relative',
        willChange:'transform,opacity',
      }}/>

      {/* Text */}
      <div ref={textRef} style={{
        zIndex:1, position:'relative',
        textAlign:'center',
        opacity:0, transform:'translateY(14px)',
        willChange:'transform,opacity',
      }}>
        <p style={{
          fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif',
          fontSize:12, fontWeight:700, letterSpacing:'0.36em',
          color:'rgba(255,255,255,0.88)', textTransform:'uppercase', marginBottom:7,
        }}>Altus Performance</p>
        <p style={{
          fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
          fontSize:9, fontWeight:300, letterSpacing:'0.2em',
          color:'rgba(255,255,255,0.32)', textTransform:'uppercase',
        }}>St Benedict&apos;s College</p>
      </div>
    </div>
  );
}
