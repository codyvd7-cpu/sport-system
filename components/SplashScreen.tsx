'use client';
import * as React from 'react';

const c3  = (t: number) => 1 - Math.pow(1-t, 3);
const c4  = (t: number) => 1 - Math.pow(1-t, 4);
const io  = (t: number) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const s   = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export default function SplashScreen() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (sessionStorage.getItem('altus_s3')) return;
    sessionStorage.setItem('altus_s3', '1');

    const canvas = canvasRef.current;
    if (!canvas) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);

    // Layout
    const CX   = W / 2;
    const CY   = H * 0.42;
    const LS   = Math.min(W * 0.36, 190);
    const LX   = CX - LS / 2;
    const LY   = CY - LS / 2;
    const LINE = LY + LS * 0.84;   // blue line sits at base of logo
    const TY   = LINE + 44;        // text baseline

    // Load logo
    const img = new Image();
    img.src = '/altus-icon.png';

    // ── Timeline ─────────────────────────────────────────────────────────────
    // Everything overlaps — no discrete frames, one continuous flow
    const T = {
      lineIn:   [0.20, 0.65] as [number,number],
      strike:   [0.55, 0.90] as [number,number],
      logoIn:   [0.75, 1.80] as [number,number],
      lineOut:  [1.30, 1.90] as [number,number],
      glowPeak: [1.40, 2.00] as [number,number],
      altus:    [1.85, 2.35] as [number,number],
      sub:      [2.20, 2.60] as [number,number],
      ready:    [2.50, 2.85] as [number,number],
      fadeOut:  [3.10, 3.65] as [number,number],
      end:       3.70,
    };

    const START = performance.now();
    let raf = 0;

    function drawLine(y: number, alpha: number, scale = 1) {
      if (alpha < 0.005) return;

      // Outer bloom
      const b = ctx.createLinearGradient(0, y - 70, 0, y + 70);
      b.addColorStop(0, 'rgba(30,144,255,0)');
      b.addColorStop(.5, `rgba(30,144,255,${0.05 * alpha * scale})`);
      b.addColorStop(1, 'rgba(30,144,255,0)');
      ctx.fillStyle = b; ctx.fillRect(0, y - 70, W, 140);

      // Inner glow
      const m = ctx.createLinearGradient(0, y - 14, 0, y + 14);
      m.addColorStop(0, 'rgba(30,144,255,0)');
      m.addColorStop(.5, `rgba(30,144,255,${0.30 * alpha * scale})`);
      m.addColorStop(1, 'rgba(30,144,255,0)');
      ctx.fillStyle = m; ctx.fillRect(0, y - 14, W, 28);

      // Core glow
      const co = ctx.createLinearGradient(0, y - 3, 0, y + 3);
      co.addColorStop(0, 'rgba(30,144,255,0)');
      co.addColorStop(.5, `rgba(100,180,255,${0.75 * alpha * scale})`);
      co.addColorStop(1, 'rgba(30,144,255,0)');
      ctx.fillStyle = co; ctx.fillRect(0, y - 3, W, 6);

      // 1 px razor
      ctx.fillStyle = `rgba(190,225,255,${0.95 * alpha * scale})`;
      ctx.fillRect(0, y, W, 1);
    }

    function drawText(txt: string, x: number, y: number, size: number, weight: number, spacing: number, alpha: number, colour = 'rgba(255,255,255,1)') {
      if (alpha < 0.005) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${size}px Inter,-apple-system,system-ui,sans-serif`;
      ctx.fillStyle = colour;
      // Manual letter-spacing
      if (spacing > 0) {
        const chars = txt.split('');
        let totalW = 0;
        chars.forEach(ch => { totalW += ctx.measureText(ch).width + spacing; });
        let cx = x - (totalW - spacing) / 2;
        chars.forEach(ch => {
          const cw = ctx.measureText(ch).width;
          ctx.fillText(ch, cx + cw / 2, y);
          cx += cw + spacing;
        });
      } else {
        ctx.fillText(txt, x, y);
      }
      ctx.restore();
    }

    function frame(now: number) {
      const t = (now - START) / 1000;

      // ── Clear ────────────────────────────────────────────────────────────────
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);

      // ── Precompute alphas ────────────────────────────────────────────────────
      const lineA  = c3(s(t, ...T.lineIn))  * (1 - c3(s(t, ...T.lineOut)));
      const strikeA= c4(s(t, ...T.strike));
      const logoA  = c4(s(t, ...T.logoIn));
      const glowA  = c4(s(t, ...T.glowPeak)) * (0.7 + 0.3 * Math.sin(t * 2.2));
      const altusA = c3(s(t, ...T.altus));
      const subA   = c3(s(t, ...T.sub));
      const readyA = c3(s(t, ...T.ready));

      // Letter spacing: 20→6px as ALTUS arrives
      const lsp = Math.round(20 - altusA * 14);

      // ── Floor atmosphere ─────────────────────────────────────────────────────
      if (lineA > 0.01 || glowA > 0.01) {
        const fa = Math.max(lineA, glowA * 0.4);
        const floor = ctx.createLinearGradient(0, LINE, 0, LINE + 90);
        floor.addColorStop(0, `rgba(30,144,255,${0.08 * fa})`);
        floor.addColorStop(1, 'rgba(5,5,5,0)');
        ctx.fillStyle = floor;
        ctx.fillRect(0, LINE, W, 90);
      }

      // ── Horizontal line ──────────────────────────────────────────────────────
      drawLine(LINE, lineA);

      // Floor mirror of line
      if (lineA > 0.01) {
        ctx.save(); ctx.globalAlpha = 0.30;
        drawLine(LINE + 22, lineA * 0.45);
        ctx.restore();
      }

      // ── Strike hotspot (energy at logo on impact) ────────────────────────────
      if (strikeA > 0.01) {
        const sg = ctx.createRadialGradient(CX, LINE, 0, CX, LINE, 160 + 60 * strikeA);
        sg.addColorStop(0,   `rgba(80,170,255,${0.55 * strikeA})`);
        sg.addColorStop(0.25,`rgba(30,144,255,${0.20 * strikeA})`);
        sg.addColorStop(0.6, `rgba(30,144,255,${0.06 * strikeA})`);
        sg.addColorStop(1,   'rgba(30,144,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(CX - 220, LINE - 220, 440, 440);

        // Wing sparks along the line at logo edges
        [LX, LX + LS].forEach(wx => {
          const wg = ctx.createRadialGradient(wx, LINE, 0, wx, LINE, 55);
          wg.addColorStop(0,  `rgba(140,210,255,${0.7 * strikeA})`);
          wg.addColorStop(.4, `rgba(30,144,255,${0.25 * strikeA})`);
          wg.addColorStop(1,  'rgba(30,144,255,0)');
          ctx.fillStyle = wg; ctx.fillRect(wx - 55, LINE - 55, 110, 110);
        });
      }

      // ── Blue base glow (beneath logo) ────────────────────────────────────────
      if (glowA > 0.02) {
        const bg = ctx.createRadialGradient(CX, LINE, 0, CX, LINE, LS * 1.0);
        bg.addColorStop(0,   `rgba(30,144,255,${0.38 * glowA})`);
        bg.addColorStop(0.3, `rgba(30,144,255,${0.15 * glowA})`);
        bg.addColorStop(0.6, `rgba(30,144,255,${0.05 * glowA})`);
        bg.addColorStop(1,   'rgba(30,144,255,0)');
        ctx.fillStyle = bg;
        ctx.fillRect(CX - LS, LINE - LS * 0.6, LS * 2, LS * 1.2);
      }

      // ── Logo ─────────────────────────────────────────────────────────────────
      if (img.complete && img.naturalWidth > 0 && logoA > 0.005) {
        // Floor reflection
        if (logoA > 0.2) {
          const rh = LS * 0.20;
          const ry = LINE + 5;
          ctx.save();
          ctx.globalAlpha = (logoA - 0.2) * 0.12;
          ctx.translate(CX, ry);
          ctx.scale(1, -1);
          ctx.drawImage(img, -LS / 2, 0, LS, rh);
          ctx.restore();
          const rf = ctx.createLinearGradient(0, ry, 0, ry + rh);
          rf.addColorStop(0, 'rgba(5,5,5,0.1)');
          rf.addColorStop(1, 'rgba(5,5,5,0.98)');
          ctx.fillStyle = rf; ctx.fillRect(0, ry, W, rh);
        }

        // Logo — emerges from darkness
        ctx.save();
        ctx.globalAlpha = clamp(logoA * 1.05, 0, 1);
        ctx.drawImage(img, LX, LY, LS, LS);
        ctx.restore();

        // Blue wash during materialise
        if (logoA < 0.7) {
          ctx.save();
          ctx.globalAlpha = (0.7 - logoA) * 0.18;
          ctx.fillStyle = '#1E90FF';
          ctx.fillRect(LX, LY, LS, LS);
          ctx.restore();
        }
      }

      // ── Text ─────────────────────────────────────────────────────────────────
      // ALTUS
      if (altusA > 0.005) {
        const sz = clamp(14 + (W < 400 ? 0 : (W - 400) * 0.02), 14, 28);
        drawText('ALTUS', CX, TY + 2, sz, 200, lsp, altusA);
      }

      // Subtitle
      if (subA > 0.005) {
        const sz2 = clamp(7 + (W < 400 ? 0 : (W - 400) * 0.004), 7, 11);
        drawText('PERFORMANCE OPERATING SYSTEM', CX, TY + 36, sz2, 300, 5, subA, `rgba(30,144,255,${subA})`);
      }

      // System Ready + corner brackets
      if (readyA > 0.005) {
        const sy = TY + 82;
        const rw = 120, rh = 28;
        const rx = CX - rw / 2;
        const ba = readyA * 0.65;
        const bsz = 9;

        // Brackets
        ctx.strokeStyle = `rgba(30,144,255,${ba})`;
        ctx.lineWidth = 1;
        [[rx, sy - rh/2, 1, 1], [rx + rw, sy - rh/2, -1, 1],
         [rx, sy + rh/2, 1, -1], [rx + rw, sy + rh/2, -1, -1]].forEach(([bx, by, dx, dy]) => {
          ctx.beginPath();
          ctx.moveTo(bx + dx * bsz, by);
          ctx.lineTo(bx, by);
          ctx.lineTo(bx, by + dy * bsz);
          ctx.stroke();
        });

        const sz3 = clamp(7 + (W < 400 ? 0 : (W - 400) * 0.003), 7, 10);
        drawText('SYSTEM READY', CX, sy, sz3, 300, 4, readyA * 0.85, `rgba(30,144,255,${readyA * 0.85})`);
      }

      // ── Fade out ─────────────────────────────────────────────────────────────
      if (t > T.fadeOut[0]) {
        const fo = c4(s(t, ...T.fadeOut));
        ctx.fillStyle = `rgba(5,5,5,${fo})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (t < T.end) raf = requestAnimationFrame(frame);
      else setDone(true);
    }

    requestAnimationFrame(() => { raf = requestAnimationFrame(frame); });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (done) return null;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#050505', pointerEvents:'none' }}>
      <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }}/>
    </div>
  );
}
