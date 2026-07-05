'use client';
import * as React from 'react';

const ease4 = (t: number) => t < 0.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t;
const easeO = (t: number) => 1 - Math.pow(1-t, 3);
const easeI = (t: number) => t * t * t;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const pct   = (t: number, a: number, b: number) => clamp((t-a)/(b-a));

export default function SplashScreen() {
  const wrapRef    = React.useRef<HTMLDivElement>(null);
  const canvasRef  = React.useRef<HTMLCanvasElement>(null);
  const nameRef    = React.useRef<HTMLDivElement>(null);
  const subRef     = React.useRef<HTMLDivElement>(null);
  const readyRef   = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(false);
  const [gone,   setGone]   = React.useState(false);

  React.useEffect(() => {
    if (sessionStorage.getItem('ap_v_final')) return;
    sessionStorage.setItem('ap_v_final', '1');
    setActive(true);
  }, []);

  React.useEffect(() => {
    if (!active) return;

    const wrap    = wrapRef.current;
    const canvas  = canvasRef.current;
    const nameEl  = nameRef.current;
    const subEl   = subRef.current;
    const readyEl = readyRef.current;
    if (!wrap || !canvas || !nameEl || !subEl || !readyEl) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W   = window.innerWidth;
    const H   = window.innerHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);

    // Logo dimensions — tall and prominent
    const LS  = Math.min(W * 0.38, 200);
    const CX  = W / 2;
    const CY  = H * 0.44;
    const LX  = CX - LS / 2;
    const LY  = CY - LS / 2;

    // Line sits at bottom edge of logo
    const LINE_Y = LY + LS * 0.82;

    const logo = new Image();
    logo.src   = '/altus-icon.png';
    const off  = document.createElement('canvas');

    logo.onload = () => {
      off.width  = LS * DPR;
      off.height = LS * DPR;
      const oc   = off.getContext('2d')!;
      oc.scale(DPR, DPR);
      oc.drawImage(logo, 0, 0, LS, LS);
    };

    // Timeline
    const T = {
      lineIn:   0.25,   // line materialises
      lineHold: 0.60,   // line at full
      strike:   0.75,   // line hits logo, energy spikes
      logoIn:   0.90,   // logo begins emerging
      logoFull: 1.60,   // logo fully formed
      lineFade: 1.40,   // line starts to fade
      nameIn:   1.75,   // ALTUS
      subIn:    2.10,   // Performance Operating System
      readyIn:  2.45,   // SYSTEM READY
      fadeOut:  2.85,
      end:      3.30,
    };

    const BLUE = '#1E90FF';
    const START = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const t = (now - START) / 1000;

      // ── Background ──────────────────────────────────────────────────────────
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);

      // ── Progress values ─────────────────────────────────────────────────────
      const lineP   = easeO(pct(t, T.lineIn,   T.lineHold));
      const lineFP  = 1 - easeO(pct(t, T.lineFade, T.logoFull));
      const lineA   = Math.min(lineP, t > T.lineFade ? lineFP : 1);

      const strikeP = easeI(pct(t, T.lineHold, T.strike));
      const logoP   = easeO(pct(t, T.logoIn,   T.logoFull));
      const glowP   = easeO(pct(t, T.logoIn,   T.logoFull + 0.2));

      // ── Horizontal line + floor reflection ─────────────────────────────────
      if (lineA > 0.01) {
        // Floor gradient (makes the floor feel reflective)
        const floorGrad = ctx.createLinearGradient(0, LINE_Y, 0, LINE_Y + 80);
        floorGrad.addColorStop(0, `rgba(30,144,255,${0.06 * lineA})`);
        floorGrad.addColorStop(1, 'rgba(5,5,5,0)');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, LINE_Y, W, 80);

        // Main horizontal line — multi-layer glow
        const drawHLine = (y: number, alphaScale: number, yShadow: boolean) => {
          // Wide bloom
          const b1 = ctx.createLinearGradient(0, y-60, 0, y+60);
          b1.addColorStop(0,   'rgba(30,144,255,0)');
          b1.addColorStop(0.5, `rgba(30,144,255,${0.055 * lineA * alphaScale})`);
          b1.addColorStop(1,   'rgba(30,144,255,0)');
          ctx.fillStyle = b1; ctx.fillRect(0, y-60, W, 120);

          // Mid glow
          const b2 = ctx.createLinearGradient(0, y-16, 0, y+16);
          b2.addColorStop(0,   'rgba(30,144,255,0)');
          b2.addColorStop(0.5, `rgba(30,144,255,${0.22 * lineA * alphaScale})`);
          b2.addColorStop(1,   'rgba(30,144,255,0)');
          ctx.fillStyle = b2; ctx.fillRect(0, y-16, W, 32);

          // Tight glow
          const b3 = ctx.createLinearGradient(0, y-3, 0, y+3);
          b3.addColorStop(0,   'rgba(30,144,255,0)');
          b3.addColorStop(0.5, `rgba(100,180,255,${0.65 * lineA * alphaScale})`);
          b3.addColorStop(1,   'rgba(30,144,255,0)');
          ctx.fillStyle = b3; ctx.fillRect(0, y-3, W, 6);

          // Hard 1px line
          ctx.fillStyle = `rgba(180,220,255,${0.90 * lineA * alphaScale})`;
          ctx.fillRect(0, y, W, 1);

          // Impact hotspots at logo edges
          if (!yShadow) {
            [LX - 8, LX + LS + 8].forEach(ix => {
              const hg = ctx.createRadialGradient(ix, y, 0, ix, y, 60);
              hg.addColorStop(0,   `rgba(120,200,255,${0.8 * lineA * alphaScale})`);
              hg.addColorStop(0.3, `rgba(30,144,255,${0.25 * lineA * alphaScale})`);
              hg.addColorStop(1,   'rgba(30,144,255,0)');
              ctx.fillStyle = hg;
              ctx.fillRect(ix - 60, y - 60, 120, 120);
            });

            // Strike burst at logo centre
            if (strikeP > 0) {
              const sg = ctx.createRadialGradient(CX, y, 0, CX, y, 120 * strikeP);
              sg.addColorStop(0,   `rgba(180,220,255,${0.6 * strikeP * lineA})`);
              sg.addColorStop(0.4, `rgba(30,144,255,${0.25 * strikeP * lineA})`);
              sg.addColorStop(1,   'rgba(30,144,255,0)');
              ctx.fillStyle = sg;
              ctx.fillRect(CX - 120, y - 120, 240, 240);
            }
          }
        };

        drawHLine(LINE_Y, 1.0, false);

        // Floor reflection of the line
        const refY = LINE_Y + 20;
        ctx.save();
        ctx.globalAlpha = 0.35 * lineA;
        drawHLine(refY, 0.4, true);
        ctx.restore();
      }

      // ── Logo ────────────────────────────────────────────────────────────────
      if (logo.complete && off.width > 0 && logoP > 0) {

        // Base glow — blue light pool at bottom of logo
        if (glowP > 0) {
          const bx = LX + LS * 0.5;
          const by = LY + LS * 0.85;
          const gr = ctx.createRadialGradient(bx, by, 0, bx, by, LS * 0.75);
          gr.addColorStop(0,   `rgba(30,144,255,${0.35 * glowP})`);
          gr.addColorStop(0.35,`rgba(30,144,255,${0.14 * glowP})`);
          gr.addColorStop(0.7, `rgba(30,144,255,${0.04 * glowP})`);
          gr.addColorStop(1,   'rgba(30,144,255,0)');
          ctx.fillStyle = gr;
          ctx.fillRect(LX - LS * 0.3, LY + LS * 0.1, LS * 1.6, LS);

          // Wide atmospheric glow
          const ag = ctx.createRadialGradient(CX, LINE_Y, 0, CX, LINE_Y, LS * 1.2);
          ag.addColorStop(0,   `rgba(30,144,255,${0.12 * glowP})`);
          ag.addColorStop(0.5, `rgba(30,144,255,${0.04 * glowP})`);
          ag.addColorStop(1,   'rgba(30,144,255,0)');
          ctx.fillStyle = ag;
          ctx.fillRect(CX - LS * 1.2, LINE_Y - LS * 0.4, LS * 2.4, LS * 0.8);
        }

        // Logo image — fades from dark silhouette to full
        ctx.save();
        ctx.globalAlpha = 0.1 + logoP * 0.88;
        ctx.drawImage(off, LX, LY, LS, LS);
        ctx.restore();

        // Blue overlay at peak (slight tint as it materialises)
        if (logoP < 0.6) {
          ctx.save();
          ctx.globalAlpha = (0.6 - logoP) * 0.15;
          ctx.fillStyle   = '#1E90FF';
          ctx.fillRect(LX, LY, LS, LS);
          ctx.restore();
        }

        // Floor reflection of logo
        if (glowP > 0.3) {
          const rp  = (glowP - 0.3) / 0.7;
          const rH  = LS * 0.22;
          const rY  = LINE_Y + 4;
          ctx.save();
          ctx.globalAlpha = 0.13 * rp;
          ctx.translate(CX, rY + rH / 2);
          ctx.scale(1, -1);
          ctx.drawImage(off, -LS / 2, -rH / 2, LS, rH);
          ctx.restore();
          // Fade gradient over reflection
          const rfg = ctx.createLinearGradient(0, rY, 0, rY + rH);
          rfg.addColorStop(0, 'rgba(5,5,5,0)');
          rfg.addColorStop(1, 'rgba(5,5,5,1)');
          ctx.fillStyle = rfg;
          ctx.fillRect(0, rY, W, rH);
        }
      }

      // ── DOM text ─────────────────────────────────────────────────────────────
      // ALTUS
      const nameP = easeO(pct(t, T.nameIn, T.nameIn + 0.5));
      const lsp   = 0.9 - nameP * 0.48; // 0.90em → 0.42em
      nameEl.style.opacity       = String(nameP);
      nameEl.style.letterSpacing = `${lsp}em`;
      nameEl.style.transform     = `translateY(${(1-nameP)*10}px)`;

      // Subtitle
      const subP = easeO(pct(t, T.subIn, T.subIn + 0.4));
      subEl.style.opacity   = String(subP);
      subEl.style.transform = `translateY(${(1-subP)*6}px)`;

      // System Ready
      const readyP = easeO(pct(t, T.readyIn, T.readyIn + 0.35));
      readyEl.style.opacity   = String(readyP);
      readyEl.style.transform = `translateY(${(1-readyP)*6}px)`;

      // ── Fade out ──────────────────────────────────────────────────────────────
      if (t > T.fadeOut) {
        const fo = easeO(pct(t, T.fadeOut, T.end));
        wrap.style.opacity = String(1 - fo);
      }

      if (t < T.end) { raf = requestAnimationFrame(draw); }
      else            { setGone(true); }
    };

    const init = requestAnimationFrame(() => { raf = requestAnimationFrame(draw); });
    return () => { cancelAnimationFrame(init); cancelAnimationFrame(raf); };
  }, [active]);

  if (!active || gone) return null;

  const LS = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.38, 200) : 160;

  return (
    <div ref={wrapRef} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#050505',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400&display=swap');
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }}/>

      {/* Text block — positioned below logo */}
      <div style={{
        position: 'absolute',
        top: `calc(44% + ${LS / 2 + 20}px)`,
        left: 0, right: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8,
        zIndex: 1,
      }}>
        {/* ALTUS */}
        <div ref={nameRef} style={{ opacity: 0, transition: 'none', textAlign: 'center' }}>
          <p style={{
            margin: 0,
            fontSize: 'clamp(18px, 3.8vw, 26px)',
            fontWeight: 200,
            letterSpacing: '0.9em',
            color: 'rgba(255,255,255,0.92)',
            textTransform: 'uppercase',
          }}>ALTUS</p>
        </div>

        {/* Performance Operating System */}
        <div ref={subRef} style={{ opacity: 0, transition: 'none', textAlign: 'center' }}>
          <p style={{
            margin: 0,
            fontSize: 'clamp(7px, 1.3vw, 10px)',
            fontWeight: 400,
            letterSpacing: '0.3em',
            color: '#1E90FF',
            textTransform: 'uppercase',
          }}>Performance Operating System</p>
        </div>

        {/* System Ready — with corner brackets */}
        <div ref={readyRef} style={{ opacity: 0, transition: 'none', marginTop: 16, position: 'relative', padding: '10px 24px', textAlign: 'center' }}>
          {/* Corner brackets */}
          {(['tl','tr','bl','br'] as const).map(c => (
            <span key={c} style={{
              position: 'absolute',
              width: 10, height: 10,
              borderColor: '#1E90FF',
              borderStyle: 'solid',
              opacity: 0.7,
              ...(c === 'tl' ? { top: 0, left: 0, borderWidth: '1px 0 0 1px' } :
                  c === 'tr' ? { top: 0, right: 0, borderWidth: '1px 1px 0 0' } :
                  c === 'bl' ? { bottom: 0, left: 0, borderWidth: '0 0 1px 1px' } :
                               { bottom: 0, right: 0, borderWidth: '0 1px 1px 0' }),
            }}/>
          ))}
          <p style={{
            margin: 0,
            fontSize: 'clamp(8px, 1.4vw, 11px)',
            fontWeight: 300,
            letterSpacing: '0.35em',
            color: '#1E90FF',
            textTransform: 'uppercase',
          }}>System Ready</p>
        </div>
      </div>
    </div>
  );
}
