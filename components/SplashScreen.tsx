'use client';
import * as React from 'react';

const ease3  = (t:number) => 1 - Math.pow(1-t, 3);
const clamp  = (v:number, a=0, b=1) => Math.min(b, Math.max(a, v));
const slice  = (t:number, a:number, b:number) => clamp((t-a)/(b-a));

export default function SplashScreen() {
  const wrapRef   = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const logoRef   = React.useRef<HTMLDivElement>(null);
  const textRef   = React.useRef<HTMLDivElement>(null);
  const lineRef   = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [gone,    setGone]    = React.useState(false);

  // Mount after hydration
  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (!mounted) return;
    if (sessionStorage.getItem('ap_v5')) { setGone(true); return; }
    sessionStorage.setItem('ap_v5', '1');
  }, [mounted]);

  // Run animation once all refs are ready
  React.useEffect(() => {
    if (!mounted || gone) return;

    // Wait one frame so React has painted the DOM
    const startRaf = requestAnimationFrame(() => {
      const wrap   = wrapRef.current;
      const canvas = canvasRef.current;
      const logoEl = logoRef.current;
      const textEl = textRef.current;
      const lineEl = lineRef.current;
      if (!wrap || !canvas || !logoEl || !textEl || !lineEl) return;

      // Canvas
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth, H = window.innerHeight;
      canvas.width  = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      const ctx = canvas.getContext('2d')!;
      ctx.scale(DPR, DPR);
      const CX = W / 2, CY = H / 2 - 15;

      // Particles
      const COLS = ['#1d4ed8','#2563eb','#3b82f6','#0ea5e9','#06b6d4','#38bdf8'];
      type P = { x:number; y:number; vx:number; vy:number; size:number; col:string; born:number; trail:{x:number;y:number}[] };
      const N = 80;
      const parts: P[] = Array.from({length:N}, (_,i) => {
        const angle  = (i/N) * Math.PI * 2 + (Math.random()-0.5) * 0.4;
        const radius = 200 + Math.random() * 300;
        const sx = CX + Math.cos(angle)*radius;
        const sy = CY + Math.sin(angle)*radius;
        const dx = CX-sx, dy = CY-sy;
        const d  = Math.sqrt(dx*dx+dy*dy);
        const sp = 2.8 + Math.random() * 2.5;
        return { x:sx, y:sy, vx:(dx/d)*sp, vy:(dy/d)*sp, size:0.8+Math.random()*1.6,
                 col:COLS[i%COLS.length], born:0.05+(i/N)*0.7, trail:[] };
      });

      // Timeline (seconds)
      const TL = { ptcEnd:2.0, logoIn:0.25, logoFull:2.0, textIn:2.4, fadeStart:3.6, end:4.4 };

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      const START = performance.now();
      let rafId = 0;

      const frame = (now: number) => {
        const t = (now - START) / 1000;

        // Trail fade
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        ctx.fillRect(0, 0, W, H);

        // Particles
        for (const p of parts) {
          if (t < p.born) continue;
          const age = t - p.born;
          const fadeIn  = clamp(age * 3);
          const fadeOut = t > TL.ptcEnd ? clamp((t - TL.ptcEnd) * 4) : 0;
          const alpha   = fadeIn * (1 - fadeOut) * 0.9;

          if (t < TL.ptcEnd) {
            const dx = CX-p.x, dy = CY-p.y;
            if (Math.sqrt(dx*dx+dy*dy) > 4) { p.x += p.vx; p.y += p.vy; }
          }

          p.trail.push({x:p.x, y:p.y});
          if (p.trail.length > 14) p.trail.shift();

          for (let i=1; i<p.trail.length; i++) {
            const pr = i/p.trail.length;
            ctx.beginPath();
            ctx.moveTo(p.trail[i-1].x, p.trail[i-1].y);
            ctx.lineTo(p.trail[i].x,   p.trail[i].y);
            ctx.strokeStyle = p.col;
            ctx.lineWidth   = p.size * pr * 0.9;
            ctx.globalAlpha = alpha * pr * 0.55;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
          ctx.fillStyle = p.col;
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Glow
        const glowA = t > TL.ptcEnd
          ? 0.12 + 0.10 * Math.sin(t * 4.2)
          : ease3(clamp(slice(t, 1.0, TL.ptcEnd))) * 0.45;
        if (glowA > 0.01) {
          const g = ctx.createRadialGradient(CX,CY,0, CX,CY,100);
          g.addColorStop(0,   `rgba(37,99,235,${glowA*0.55})`);
          g.addColorStop(0.5, `rgba(6,182,212,${glowA*0.2})`);
          g.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(CX-100, CY-100, 200, 200);
        }

        // Logo
        const logoProg = ease3(clamp(slice(t, TL.logoIn, TL.logoFull)));
        const blur  = (1-logoProg) * 16;
        const scale = 1.07 - 0.07 * logoProg;
        const loOp  = clamp(slice(t, TL.logoIn, TL.logoIn+1.4));
        const glow  = t > TL.logoFull ? 20 + 10*Math.sin(t*4.2) : logoProg*20;
        logoEl.style.opacity   = String(loOp);
        logoEl.style.transform = `scale(${scale.toFixed(4)})`;
        logoEl.style.filter    = `blur(${blur.toFixed(1)}px) drop-shadow(0 0 ${glow.toFixed(0)}px rgba(37,99,235,0.7)) drop-shadow(0 0 ${(glow*2.2).toFixed(0)}px rgba(37,99,235,0.22))`;

        // Text + line
        const lnP  = ease3(clamp(slice(t, TL.textIn, TL.textIn+0.5)));
        const txP  = ease3(clamp(slice(t, TL.textIn+0.15, TL.textIn+1.0)));
        lineEl.style.transform = `scaleX(${lnP.toFixed(4)})`;
        lineEl.style.opacity   = String(lnP);
        textEl.style.opacity   = String(txP);
        textEl.style.transform = `translateY(${((1-txP)*14).toFixed(1)}px)`;

        // Fade out
        if (t > TL.fadeStart) {
          const fo = clamp(slice(t, TL.fadeStart, TL.end));
          wrap.style.opacity = String(1 - fo*fo);
        }

        if (t < TL.end) {
          rafId = requestAnimationFrame(frame);
        } else {
          setGone(true);
        }
      };

      rafId = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(rafId);
    });

    return () => cancelAnimationFrame(startRaf);
  }, [mounted, gone]);

  if (!mounted || gone) return null;

  return (
    <div ref={wrapRef} style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'#000',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      pointerEvents:'none',
    }}>
      <canvas ref={canvasRef} style={{position:'absolute',inset:0}}/>

      <div ref={logoRef} style={{
        position:'relative', zIndex:1,
        width:'min(200px, 38vw)', height:'min(200px, 38vw)', marginBottom:30,
        opacity:0, willChange:'transform,filter,opacity',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/altus-icon.png" alt="Altus"
          style={{width:'100%',height:'100%',objectFit:'contain',display:'block'}}/>
      </div>

      <div ref={lineRef} style={{
        zIndex:1, position:'relative',
        width:44, height:1.5, marginBottom:18,
        background:'linear-gradient(90deg,transparent,#3b82f6,#06b6d4,transparent)',
        transformOrigin:'center', opacity:0, transform:'scaleX(0)',
        willChange:'transform,opacity',
      }}/>

      <div ref={textRef} style={{
        zIndex:1, position:'relative',
        textAlign:'center', opacity:0, transform:'translateY(14px)',
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
