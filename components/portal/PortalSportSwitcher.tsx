'use client';
import * as React from 'react';
import { useBranding } from '@/components/BrandingProvider';
import { getSportLabel, getSportColor, type SportKey } from '@/lib/sports';

// ─── PortalSportSwitcher ───────────────────────────────────────────────────────
// Lets a parent move between the sports their school runs, without logging out.
//
// This exists because the portal used to be locked to whichever sport the
// access code belonged to. A parent with a hockey daughter and a rugby son
// needed two codes and had to sign out to switch between their own children —
// which is the sort of thing that makes an app feel broken even when every
// screen works.
//
// Only renders when the school runs more than one sport; a single-sport school
// gets no switcher, because there is nothing to switch to.

export default function PortalSportSwitcher({ current }: { current: SportKey }) {
  const { sports } = useBranding();
  if (!sports || sports.length <= 1) return null;

  return (
    <div style={{
      display: 'flex', gap: 6, overflowX: 'auto',
      padding: '10px 0 2px', WebkitOverflowScrolling: 'touch',
    }}>
      {sports.map(s => {
        const active = s.key === current;
        const colour = getSportColor(s.key as SportKey) || s.color;
        return (
          <a key={s.key} href={`/portal?sport=${encodeURIComponent(s.key)}`}
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              background: active ? colour + '22' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? colour + '66' : 'rgba(255,255,255,0.07)'}`,
              color: active ? colour : 'rgba(255,255,255,0.45)',
              transition: 'all 0.2s',
            }}>
            {getSportLabel(s.key as SportKey) || s.label}
          </a>
        );
      })}
    </div>
  );
}
