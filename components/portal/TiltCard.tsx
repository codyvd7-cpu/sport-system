'use client';
import * as React from 'react';
import { useTilt } from '@/components/portal/useTilt';

// ─── TiltCard ─────────────────────────────────────────────────────────────────
// Drop-in wrapper that gives any card the pointer-tracked 3D tilt + cursor
// sheen from useTilt, so the whole portal leans and catches light as one
// system. Renders a <div>; pass your own style/className/onClick through.
//
//   <TiltCard style={{ borderRadius:16, ... }}>
//     ...card content...
//   </TiltCard>
//
// The sheen sits above the content but ignores pointer events, so clicks and
// links inside the card still work. Tilt is off on touch / reduced-motion
// (handled inside useTilt), so phones get the plain card.

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  scale?: number;
  lift?: number;
  children: React.ReactNode;
}

export default function TiltCard({ max = 8, scale = 1.02, lift = 5, children, style, ...rest }: Props) {
  const tilt = useTilt({ max, scale, lift });
  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        transition: 'transform .3s cubic-bezier(0.16,1,0.3,1), box-shadow .3s cubic-bezier(0.16,1,0.3,1)',
        willChange: 'transform',
        ...style,
      }}
      {...rest}
    >
      {children}
      <div style={tilt.sheen}/>
    </div>
  );
}
