'use client';
import * as React from 'react';

// ─── Easing ───────────────────────────────────────────────────────────────────
const easeInOut = (t: number) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
const easeOut   = (t: number) => 1 - Math.pow(1-t, 3);
const clamp     = (v: number, a=0, b=1) => Math.min(b, Math.max(a, v));
const slice     = (t: number, a: number, b: number) => clamp((t-a)/(b-a));

export default function SplashScreen() {
  const canvasRef  = React.useRef<HTMLCanvasElement>(null);
  const logoRef    = React.useRef<HTMLDivElement>(null);
  const textRef    = React.useRef<HTMLDivElement>(null);
  const subRef     = React.useRef<HTMLDivElement>(null);
  const wrapRef    = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(false);
  const [gone,   setGone]   = React.useState(false);

  React.useEffect(() => {
    if (sessionStorage.getItem('ap_beam')) return;
    sessionStorage.setItem('ap_beam', '1');
    setActive(true);
  }, []);

  React.useEffect(() => {
    if (!active) return;

    const wrap   = wrapRef.current;
    const canvas = canvasRef.current;
    const logoEl = logoRef.current;
    const textEl = textRef.current;
    const subEl  = subRef.current;
    if (!wrap || !canvas || !logoEl || !textEl || !subEl) return;

    let rafId = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W   = window.innerWidth;
    const H   = window.innerHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    const CX = W / 2;
    const CY = H / 2 - 30;

    // Load logo
    const logo = new Image();
    logo.src   = '/altus-icon.png';

    const LOGO_SIZE = Math.min(W * 0.22, 120);
    const lx = CX - LOGO_SIZE / 2;
    const ly = CY - LOGO_SIZE / 2;

    // ── Timeline (seconds) ───────────────────────────────────────────────────
    // 0.0 – 0.25  : pure black
    // 0.25 – 0.45 : beam appears (vertical line materialises at left of logo)
    // 0.45 – 1.80 : beam sweeps across, logo revealed behind it
    // 1.80 – 2.10 : beam exits right, logo holds with edge glow
    // 2.10 – 2.45 : "ALTUS" fades in
    // 2.45 – 2.70 : subtitle fades in
    // 2.70 – 3.20 : gentle push-in, hold
    // 3.20 – 3.80 : fade to transparent → app appears

    const TL = {
      beamAppear:  [0.25, 0.45] as [number,number],
      beamSweep:   [0.45, 1.80] as [number,number],
      holdGlow:    [1.80, 2.10] as [number,number],
      textIn:      [2.10, 2.45] as [number,number],
      subIn:       [2.45, 2.70] as [number,number],
      fadeOut:     [3.20, 3.80] as [number,number],
      end:         3.85,
    };

    const START = performance.now();

    const frame = (now: number) => {
      const t = (now - START) / 1000;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);

      // ── Beam X position (sweeps from lx-40 to lx+LOGO_SIZE+40) ────────────
      const sweepProg = easeInOut(clamp(slice(t, TL.beamSweep[0], TL.beamSweep[1])));
      const beamX     = (lx - 50) + (LOGO_SIZE + 100) * sweepProg;
      const beamAlpha = easeOut(clamp(slice(t, TL.beamAppear[0], TL.beamAppear[1])));

      // ── Draw logo with clip (only reveal left-of-beam) ────────────────────
      if (logo.complete) {
        const revealX = beamX + 12; // slightly ahead of beam centre

        // Revealed portion (left of beam)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, revealX, H);
        ctx.clip();
        ctx.globalAlpha = 0.92;
        ctx.drawImage(logo, lx, ly, LOGO_SIZE, LOGO_SIZE);
        ctx.restore();

        // After beam exits: logo fully visible with subtle blue edge
        if (t > TL.holdGlow[0]) {
          const holdProg = clamp(slice(t, TL.holdGlow[0], TL.holdGlow[1]));
          ctx.save();
          ctx.globalAlpha = holdProg * 0.92;
          ctx.drawImage(logo, lx, ly, LOGO_SIZE, LOGO_SIZE);
          ctx.restore();

          // Blue edge glow (drop shadow effect on canvas via radial)
          const glowA = 0.12 + 0.04 * Math.sin(t * 3);
          const grd   = ctx.createRadialGradient(CX, CY, LOGO_SIZE*0.3, CX, CY, LOGO_SIZE*0.75);
          grd.addColorStop(0,   `rgba(30,144,255,0)`);
          grd.addColorStop(0.7, `rgba(30,144,255,${glowA * holdProg})`);
          grd.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.globalAlpha = 1;
          ctx.fillRect(lx - 30, ly - 30, LOGO_SIZE + 60, LOGO_SIZE + 60);
        }

        // Subtle reflective floor beneath logo
        if (t > TL.holdGlow[0]) {
          const rp = clamp(slice(t, TL.holdGlow[0], TL.holdGlow[1]));
          ctx.save();
          ctx.globalAlpha = 0.12 * rp;
          ctx.scale(1, -0.25);
          ctx.drawImage(logo, lx, -(ly + LOGO_SIZE + 32 + LOGO_SIZE * 0.25) * 4, LOGO_SIZE, LOGO_SIZE);
          ctx.restore();
          // Fade reflection with gradient
          const rGrad = ctx.createLinearGradient(0, ly + LOGO_SIZE + 2, 0, ly + LOGO_SIZE + 30);
          rGrad.addColorStop(0, 'rgba(5,5,5,0)');
          rGrad.addColorStop(1, 'rgba(5,5,5,1)');
          ctx.fillStyle = rGrad;
          ctx.fillRect(0, ly + LOGO_SIZE + 2, W, 28);
        }
      }

      // ── The beam itself ───────────────────────────────────────────────────
      if (beamAlpha > 0.01 && t < TL.holdGlow[1]) {
        const beamVisible = t < TL.beamSweep[1] ? beamAlpha : 1 - clamp(slice(t, TL.holdGlow[0], TL.holdGlow[1]));

        // Glow spread
        const spread = 50;
        const grd = ctx.createLinearGradient(beamX - spread, 0, beamX + spread, 0);
        grd.addColorStop(0,    'rgba(30,144,255,0)');
        grd.addColorStop(0.35, `rgba(30,144,255,${0.08 * beamVisible})`);
        grd.addColorStop(0.5,  `rgba(30,144,255,${0.55 * beamVisible})`);
        grd.addColorStop(0.65, `rgba(30,144,255,${0.08 * beamVisible})`);
        grd.addColorStop(1,    'rgba(30,144,255,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(beamX - spread, 0, spread * 2, H);

        // Razor-thin core line (2px)
        ctx.fillStyle = `rgba(140,190,255,${0.85 * beamVisible})`;
        ctx.fillRect(beamX - 1, 0, 2, H);
      }

      // ── Text via DOM (not canvas — better font rendering) ─────────────────
      const textProg  = easeOut(clamp(slice(t, TL.textIn[0], TL.textIn[1])));
      const subProg   = easeOut(clamp(slice(t, TL.subIn[0], TL.subIn[1])));
      textEl.style.opacity   = String(textProg);
      textEl.style.transform = `translateY(${(1-textProg)*10}px)`;
      subEl.style.opacity    = String(subProg);

      // ── Logo DOM push-in (complement canvas logo) ─────────────────────────
      // Canvas handles the logo, DOM handles the fade-out wrapper
      if (t > TL.fadeOut[0]) {
        const fo = clamp(slice(t, TL.fadeOut[0], TL.fadeOut[1]));
        wrap.style.opacity = String(1 - easeOut(fo));
      }

      if (t < TL.end) {
        rafId = requestAnimationFrame(frame);
      } else {
        setGone(true);
      }
    };

    const startRaf = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(frame);
    });

    return () => { cancelAnimationFrame(startRaf); cancelAnimationFrame(rafId); };
  }, [active]);

  if (!active || gone) return null;

  return (
    <div ref={wrapRef} style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'#050505',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      pointerEvents:'none',
    }}>
      {/* Canvas handles logo + beam */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0 }}/>

      {/* Spacer to push text below where the logo is */}
      <div ref={logoRef} style={{ width:1, height:Math.min(window?.innerWidth*0.22||120, 120)+40 }}/>

      {/* Text block — DOM rendered for crisp fonts */}
      <div style={{ position:'relative', zIndex:1, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <div ref={textRef} style={{ opacity:0, transform:'translateY(10px)', transition:'none' }}>
          <p style={{
            fontFamily:'-apple-system,"SF Pro Display","Helvetica Neue",system-ui,sans-serif',
            fontSize: 'clamp(20px,4vw,28px)',
            fontWeight: 300,
            letterSpacing: '0.45em',
            color: 'rgba(255,255,255,0.92)',
            textTransform: 'uppercase',
            margin: 0,
          }}>ALTUS</p>
        </div>
        <div ref={subRef} style={{ opacity:0 }}>
          <p style={{
            fontFamily:'-apple-system,"SF Pro Text",system-ui,sans-serif',
            fontSize: 'clamp(8px,1.4vw,11px)',
            fontWeight: 400,
            letterSpacing: '0.28em',
            color: 'rgba(255,255,255,0.22)',
            textTransform: 'uppercase',
            margin: 0,
          }}>Performance Operating System</p>
        </div>
      </div>
    </div>
  );
}
