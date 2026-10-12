'use client';
import * as React from 'react';

// ─── useTilt ────────────────────────────────────────────────────────────────
// Gives an element a real, pointer-tracked 3D tilt — the card leans toward the
// cursor in perspective space, with a highlight sheen that follows the pointer.
// This is the "high-definition 3D" that reads as premium without a WebGL
// canvas that can freeze the page: it is pure CSS transform on one element.
//
// Deliberately restrained:
//   • max tilt is small (default 7°) so it feels like weight, not a gimmick
//   • disabled entirely on touch / coarse pointers (phones get no hover)
//   • disabled under prefers-reduced-motion
//   • returns to rest smoothly on leave
//
// Usage:
//   const { ref, onMouseMove, onMouseLeave, sheen } = useTilt();
//   <div ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
//        style={{ transformStyle:'preserve-3d', transition:'transform .3s var(--ease)' }}>
//     ...card...
//     <div style={sheen}/>   // optional cursor-tracked highlight
//   </div>

interface Options {
  max?: number;      // maximum tilt in degrees
  scale?: number;    // lift scale on hover
  lift?: number;     // translateY in px on hover
}

export function useTilt({ max = 7, scale = 1.015, lift = 4 }: Options = {}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef<number | null>(null);
  const [sheenPos, setSheenPos] = React.useState({ x: 50, y: 0, on: false });

  const enabled = React.useRef(true);
  React.useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    enabled.current = !coarse && !reduced;
  }, []);

  const onMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!enabled.current) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;   // 0..1
    const py = (e.clientY - r.top) / r.height;   // 0..1
    const rotY = (px - 0.5) * (max * 2);
    const rotX = (0.5 - py) * (max * 2);
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform =
        `perspective(1100px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(${-lift}px) scale(${scale})`;
    });
    setSheenPos({ x: px * 100, y: py * 100, on: true });
  }, [max, scale, lift]);

  const onMouseLeave = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
    setSheenPos(p => ({ ...p, on: false }));
  }, []);

  // A soft radial highlight that sits over the card and follows the cursor.
  const sheen: React.CSSProperties = {
    position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
    background: `radial-gradient(420px circle at ${sheenPos.x}% ${sheenPos.y}%, rgba(255,255,255,0.18), transparent 45%)`,
    opacity: sheenPos.on ? 1 : 0,
    transition: 'opacity .35s var(--ease)',
    mixBlendMode: 'soft-light',
  };

  return { ref, onMouseMove, onMouseLeave, sheen };
}
