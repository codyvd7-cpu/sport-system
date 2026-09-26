'use client';
import * as React from 'react';
import { useBranding } from '@/components/BrandingProvider';
import { getSportLabel, getSportColor, type SportKey } from '@/lib/sports';

// ─── PortalSportSwitcher ───────────────────────────────────────────────────────
// Moving between the sports a school runs.
//
// Rebuilt from flat text pills. The previous version was a row of grey
// rounded rectangles — functional, but it read as a filter control on a
// settings screen rather than navigation between a school's departments.
//
// Now: a single continuous track with the active sport carried by that
// sport's own colour and a sliding underline. The indicator moves rather
// than appearing, which makes the relationship between the sports legible
// instead of each one looking like an isolated button.
//
// Only renders when the school runs more than one sport — a switcher with a
// single option is just a label.

export default function PortalSportSwitcher({ current }: { current: SportKey }) {
  const { sports } = useBranding();

  const [base, setBase] = React.useState('/portal');
  const [schoolParam, setSchoolParam] = React.useState('');
  React.useEffect(() => {
    const m = window.location.pathname.match(/^\/([^/]+)\/portal/);
    if (m) { setBase(`/${m[1]}/portal`); setSchoolParam(''); return; }
    const slug = new URLSearchParams(window.location.search).get('school');
    setSchoolParam(slug ? `&school=${encodeURIComponent(slug)}` : '');
  }, []);

  const trackRef = React.useRef<HTMLDivElement>(null);
  const [ind, setInd] = React.useState<{ left: number; width: number } | null>(null);

  // Measure the active item so the underline can slide to it. Recomputed on
  // resize because the track scrolls horizontally on narrow screens.
  React.useLayoutEffect(() => {
    const measure = () => {
      const el = trackRef.current?.querySelector<HTMLElement>('[data-active="true"]');
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [current, sports]);

  if (!sports || sports.length <= 1) return null;

  const activeColor = getSportColor(current) || '#38bdf8';

  return (
    <div style={{ position:'relative', marginTop:4 }}>
      <div
        ref={trackRef}
        style={{
          position:'relative', display:'flex', gap:2, overflowX:'auto',
          borderBottom:'1px solid rgba(255,255,255,0.08)',
          scrollbarWidth:'none', msOverflowStyle:'none',
        }}
      >
        <style>{`.psw::-webkit-scrollbar{display:none}`}</style>

        {sports.map(sp => {
          const active = sp.key === current;
          const c = getSportColor(sp.key as SportKey) || sp.color;
          return (
            <a
              key={sp.key}
              data-active={active}
              href={`${base}?sport=${encodeURIComponent(sp.key)}${schoolParam}`}
              style={{
                flexShrink:0, padding:'12px 18px 13px', textDecoration:'none',
                fontSize:13, fontWeight:active ? 800 : 600, whiteSpace:'nowrap',
                color: active ? 'white' : 'rgba(255,255,255,0.4)',
                transition:'color .25s ease',
              }}
            >
              {getSportLabel(sp.key as SportKey) || sp.label}
              {active && (
                <span style={{
                  display:'inline-block', width:5, height:5, borderRadius:'50%',
                  background:c, marginLeft:8, verticalAlign:'middle',
                }}/>
              )}
            </a>
          );
        })}

        {/* The underline slides between sports rather than snapping on and
            off, so the set reads as one navigation strip. */}
        {ind && (
          <span style={{
            position:'absolute', bottom:-1, height:2, borderRadius:2,
            background:activeColor,
            left:ind.left, width:ind.width,
            transition:'left .34s cubic-bezier(.22,1,.36,1), width .34s cubic-bezier(.22,1,.36,1), background .3s ease',
          }}/>
        )}
      </div>
    </div>
  );
}
