'use client';
import * as React from 'react';

// ─── PortalCinematicLayer ─────────────────────────────────────────────────────
// A single fixed, non-interactive layer that grades the whole portal like
// graded film: a fine grain, a soft vignette that frames the content, and one
// very diffuse accent aura that breathes. It is what makes the difference
// between "a dark website" and "a cinematic surface".
//
// Why it is safe to mount over everything:
//   • pointerEvents:none — never intercepts a tap or hover
//   • zIndex sits above the base background but BELOW all content (content is
//     z-indexed at 1+), so text and cards are never dimmed or blurred
//   • grain is a tiny inline SVG tiled by the GPU; no network, no canvas loop
//   • the breathing aura is one transform/opacity keyframe — effectively free
//   • honours prefers-reduced-motion (the breath stops; the grade stays)
//
// Replaces nothing — it layers on top of PortalAmbient's colour wash.

interface Props { color: string; }

export default function PortalCinematicLayer({ color }: Props) {
  return (
    <div aria-hidden style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <style>{`
        @keyframes pcl-breathe {
          0%,100% { opacity:.30; transform:translate(-50%,-50%) scale(1); }
          50%     { opacity:.55; transform:translate(-50%,-50%) scale(1.08); }
        }
        @keyframes pcl-grain {
          0%   { transform: translate(0,0); }
          10%  { transform: translate(-4%,-3%); }
          30%  { transform: translate(3%,-5%); }
          50%  { transform: translate(-3%,4%); }
          70%  { transform: translate(4%,3%); }
          90%  { transform: translate(-4%,2%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pcl-aura  { animation: none !important; }
          .pcl-grain { animation: none !important; }
        }
      `}</style>

      {/* Breathing accent aura — the living light of the school's colour,
          sitting high and very diffuse so it never competes with content. */}
      <div className="pcl-aura" style={{
        position:'absolute', top:'22%', left:'50%', width:1100, height:1100, borderRadius:'50%',
        background:`radial-gradient(circle, ${color}1f 0%, ${color}0a 38%, transparent 68%)`,
        filter:'blur(30px)', animation:'pcl-breathe 26s ease-in-out infinite',
      }}/>

      {/* Cinematic vignette — frames the eye toward the centre column. */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(130% 100% at 50% 35%, transparent 55%, rgba(2,5,11,0.55) 100%)',
      }}/>

      {/* Fine film grain — a tiled SVG noise, GPU-cheap, drifting slowly so it
          never looks like a static dirty screen. Low opacity: felt, not seen. */}
      <div className="pcl-grain" style={{
        position:'absolute', inset:'-50%', width:'200%', height:'200%',
        opacity:0.045, mixBlendMode:'overlay',
        animation:'pcl-grain 7s steps(6) infinite',
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize:'160px 160px',
      }}/>
    </div>
  );
}
