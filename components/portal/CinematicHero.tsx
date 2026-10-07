'use client';
import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// WebGL layer loads client-only — it can't server-render.
const Hero3D = dynamic(() => import('./Hero3D'), { ssr: false });

// ─── CinematicHero ─────────────────────────────────────────────────────────────
// The showpiece. Cinematic, atmospheric — the school's identity emerging from
// darkness. Built to be the moment that decides whether this is "a school app"
// or "THE school app".
//
// The staging, layer by layer (back to front):
//   1. A living canvas: slow drifting embers of light in the school's colour,
//      a vignette, and a faint moving sheen — depth that breathes.
//   2. The photograph, under a deep gradient, with a slow Ken-Burns push.
//   3. A choreographed entrance: the crest fades up and settles first, then
//      the school name, then the sport in serif, then the rule draws across,
//      then the standfirst, then the fixture panel slides in. Each waits for
//      the last — it reads as directed, not animated.
//   4. Parallax on scroll: the photo and text drift at different rates so the
//      scene has physical depth.
//   5. Hidden details: the crest has a slow breathing glow; the fixture panel
//      corner catches light on hover; a near-invisible grain over everything;
//      the ember field subtly reacts to the pointer.

type Props = {
  schoolName: string;
  sportLabel: string;
  crestUrl: string | null;
  photoUrl: string | null;
  accent: string;
  description: string;
  nextFixture: { opponent: string; date: string; time: string | null; venue: string | null; homeAway: string | null; countdown: string } | null;
};

export default function CinematicHero({
  schoolName, sportLabel, crestUrl, photoUrl, accent, description, nextFixture,
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const scrollY = React.useRef(0);
  const pointer = React.useRef({ x: 0.5, y: 0.5 });

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    const onScroll = () => { scrollY.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, []);

  // ── The living canvas: embers + sheen ──────────────────────────────────────
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Parse accent to rgb once.
    const hex = accent.replace('#', '');
    const ar = parseInt(hex.slice(0, 2) || '3b', 16);
    const ag = parseInt(hex.slice(2, 4) || '6e', 16);
    const ab = parseInt(hex.slice(4, 6) || 'a5', 16);

    type Ember = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number };
    const embers: Ember[] = [];
    const spawn = (): Ember => {
      const max = 6 + Math.random() * 8;
      return {
        x: Math.random() * W,
        y: H * 0.5 + Math.random() * H * 0.6,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.15 - Math.random() * 0.35,
        r: 0.6 + Math.random() * 2.2,
        life: 0, max,
      };
    };
    for (let i = 0; i < 46; i++) { const e = spawn(); e.life = Math.random() * e.max; embers.push(e); }

    let tSheen = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Moving diagonal sheen — a slow bar of faint light crossing the scene.
      tSheen += 0.0016;
      const sx = (Math.sin(tSheen) * 0.5 + 0.5) * W * 1.4 - W * 0.2;
      const grad = ctx.createLinearGradient(sx - 160, 0, sx + 160, H);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, `rgba(${ar},${ag},${ab},0.05)`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Embers — drift up, pulled gently toward the pointer.
      for (const e of embers) {
        e.life += 0.016;
        if (e.life >= e.max) Object.assign(e, spawn());
        const px = pointer.current.x * W, py = pointer.current.y * H;
        const dx = px - e.x, dy = py - e.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 40000) { e.vx += (dx / Math.sqrt(d2 + 1)) * 0.004; e.vy += (dy / Math.sqrt(d2 + 1)) * 0.004; }
        e.x += e.vx; e.y += e.vy;
        const fade = Math.sin((e.life / e.max) * Math.PI); // in then out
        const alpha = fade * 0.5;
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 4);
        g.addColorStop(0, `rgba(${ar + 60},${ag + 60},${ab + 60},${alpha})`);
        g.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onMove = (ev: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.current = { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
    };
    window.addEventListener('pointermove', onMove);

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove); };
  }, [accent]);

  // Parallax — reads scrollY each frame for the photo + content.
  const [pBg, setPBg] = React.useState(0);
  const [pFg, setPFg] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const loop = () => {
      setPBg(scrollY.current * 0.25);
      setPFg(scrollY.current * 0.12);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Choreographed entrance — each element's style, staged by delay.
  const stage = (delay: number, y = 20): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : `translateY(${y}px)`,
    transition: `opacity 1s cubic-bezier(.16,1,.3,1) ${delay}s, transform 1.1s cubic-bezier(.16,1,.3,1) ${delay}s`,
  });

  return (
    <section ref={rootRef} style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', background: '#070a0f' }}>
      {/* Layer 2 — photograph, Ken-Burns + parallax */}
      {photoUrl && (
        <div style={{ position: 'absolute', inset: '-8% 0', zIndex: 0, transform: `translateY(${pBg}px)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%',
            transform: mounted ? 'scale(1.06)' : 'scale(1.14)',
            transition: 'transform 6s cubic-bezier(.16,1,.3,1)',
            filter: 'saturate(0.85) brightness(0.72)',
          }} />
        </div>
      )}

      {/* Deep cinematic gradient — the darkness it emerges from */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1,
        background: `radial-gradient(130% 90% at 25% 15%, transparent 0%, rgba(7,10,15,0.55) 55%, #070a0f 100%),
                     linear-gradient(180deg, rgba(7,10,15,0.4) 0%, transparent 30%, rgba(7,10,15,0.55) 70%, #070a0f 100%)` }} />

      {/* Layer 1 — living canvas (embers + sheen) */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      {/* Layer 3.5 — the real WebGL scene: a dimensional crest in volumetric
          light, depth particles, parallax to the pointer. This is the "3D" */}
      <Hero3D accent={accent} crestUrl={crestUrl} />

      {/* Hidden detail — near-invisible film grain over everything */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', opacity: 0.04, mixBlendMode: 'overlay',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'120\' height=\'120\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 5, width: '100%', maxWidth: 1180, margin: '0 auto', padding: '0 32px 64px', transform: `translateY(${-pFg}px)` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 48, alignItems: 'end' }} className="ch-grid">

          <div>
            {/* The crest now lives in the 3D scene above, floating in light. */}
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, letterSpacing: '0.12em',
              fontVariantCaps: 'all-small-caps', color: 'rgba(244,241,234,0.62)', marginBottom: 14, ...stage(0.25) }}>
              {schoolName}
            </p>

            <h1 style={{ fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto', fontWeight: 600,
              fontSize: 'clamp(52px,7vw,100px)', letterSpacing: '-0.02em', lineHeight: 0.95,
              color: 'rgba(244,241,234,0.97)', marginBottom: 22,
              textShadow: '0 20px 60px rgba(0,0,0,0.5)', ...stage(0.42, 28) }}>
              {sportLabel}
            </h1>

            {/* The rule draws ACROSS rather than fading */}
            <div style={{ height: 1, background: `linear-gradient(90deg, ${accent}, transparent)`,
              width: mounted ? 180 : 0, transition: 'width 1.2s cubic-bezier(.16,1,.3,1) 0.7s', marginBottom: 22 }} />

            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(14px,1.5vw,16px)',
              color: 'rgba(244,241,234,0.56)', lineHeight: 1.7, maxWidth: 440, marginBottom: 34, ...stage(0.85) }}>
              {description}
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', ...stage(1.0) }} className="ch-ctas">
              <a href="#this-week" className="ch-btn" style={{ background: accent, color: '#070a0f' }}>This week</a>
              <Link href="/player/auth" className="ch-btn ch-btn-ghost">Sign in</Link>
            </div>
          </div>

          {/* Fixture panel — slides in last, corner catches light on hover */}
          {nextFixture && (
            <div style={stage(1.15, 24)}>
              <div className="ch-fixture">
                <div className="ch-fixture-sheen" />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid rgba(244,241,234,0.09)' }}>
                  <span className="ch-lbl">Next fixture</span>
                  <span className="ch-lbl" style={{ color: accent }}>{nextFixture.countdown}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, color: 'rgba(244,241,234,0.96)', padding: '20px 18px 6px', lineHeight: 1.05 }}>
                  {nextFixture.opponent}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid rgba(244,241,234,0.09)', marginTop: 14 }}>
                  {[['Date', nextFixture.date], ['Time', nextFixture.time], ['Venue', nextFixture.venue], ['Ground', nextFixture.homeAway?.toUpperCase()]]
                    .filter(([, v]) => v).map(([l, v], i) => (
                      <div key={l} style={{ padding: '12px 18px', borderRight: i % 2 === 0 ? '1px solid rgba(244,241,234,0.07)' : 'none', borderTop: i >= 2 ? '1px solid rgba(244,241,234,0.07)' : 'none' }}>
                        <p className="ch-lbl" style={{ marginBottom: 3 }}>{l}</p>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'rgba(244,241,234,0.9)' }}>{v}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll cue — a hidden-ish detail at the base, fades in late and breathes */}
      <div style={{ position: 'absolute', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 5, ...stage(1.6) }}>
        <div className="ch-scroll" />
      </div>

      <style>{`
        .ch-breathe { animation: chBreathe 4s ease-in-out infinite; }
        @keyframes chBreathe { 0%,100%{opacity:.5;transform:scale(.92)} 50%{opacity:1;transform:scale(1.08)} }
        .ch-btn { font-family: var(--font-ui); font-size: 14px; font-weight: 600; padding: 14px 30px; border-radius: 10px; text-decoration: none; transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s; }
        .ch-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(0,0,0,0.4); }
        .ch-btn-ghost { background: rgba(244,241,234,0.06); color: rgba(244,241,234,0.8); border: 1px solid rgba(244,241,234,0.18); backdrop-filter: blur(8px); }
        .ch-lbl { font-family: var(--font-ui); font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; font-variant-caps: all-small-caps; color: rgba(244,241,234,0.5); }
        .ch-fixture { position: relative; overflow: hidden; border-radius: 14px; background: rgba(10,13,18,0.72); border: 1px solid rgba(244,241,234,0.12); backdrop-filter: blur(16px); transition: border-color .3s, transform .3s cubic-bezier(.16,1,.3,1); }
        .ch-fixture:hover { border-color: rgba(244,241,234,0.24); transform: translateY(-3px); }
        .ch-fixture-sheen { position: absolute; top: 0; left: -60%; width: 60%; height: 100%; background: linear-gradient(105deg, transparent, rgba(255,255,255,0.06), transparent); transition: left .7s cubic-bezier(.16,1,.3,1); pointer-events: none; }
        .ch-fixture:hover .ch-fixture-sheen { left: 120%; }
        .ch-scroll { width: 22px; height: 34px; border: 1px solid rgba(244,241,234,0.25); border-radius: 12px; position: relative; }
        .ch-scroll::after { content: ''; position: absolute; left: 50%; top: 7px; width: 3px; height: 7px; border-radius: 2px; background: rgba(244,241,234,0.6); transform: translateX(-50%); animation: chScroll 2s cubic-bezier(.16,1,.3,1) infinite; }
        @keyframes chScroll { 0%{opacity:0;transform:translate(-50%,0)} 40%{opacity:1} 80%{opacity:0;transform:translate(-50%,10px)} 100%{opacity:0} }
        @media (max-width: 860px) { .ch-grid { grid-template-columns: 1fr !important; gap: 32px !important; } }
        @media (prefers-reduced-motion: reduce) { .ch-breathe, .ch-scroll::after, .ch-fixture-sheen { animation: none; } }
      `}</style>
    </section>
  );
}
