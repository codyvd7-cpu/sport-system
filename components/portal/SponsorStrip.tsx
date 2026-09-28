'use client';
import * as React from 'react';

// ─── SponsorStrip ──────────────────────────────────────────────────────────────
// A school's commercial partners.
//
// REBUILT. This component previously had FOUR SPONSORS HARDCODED IN THE
// SOURCE — the original pilot school's partners — so every school on the
// platform displayed another school's commercial relationships. That
// misrepresents a sponsorship that doesn't exist, to that school's parents.
//
// Sponsors come from portal_sponsors, which portal-admin already manages and
// which a database trigger scopes to the signed-in coach's school. They
// arrive with the rest of the portal payload, so no extra request is needed.
//
// A school with no sponsors renders NOTHING — an empty "Partners" heading,
// or invented logos, is worse than simply not having the section.
//
// The presentation also dropped the hover lift and the shine sweep that
// travelled across each logo. A sponsor's mark should sit still and be
// legible; animating it is the sort of thing that reads as a template.

type Sponsor = {
  id: string; name: string; image_url: string | null;
  sponsor_link: string | null; sort_order: number | null;
};

export default function SponsorStrip({ color, sponsors = [] }: { color: string; sponsors?: any[] }) {
  // Nothing at all until we know, and nothing at all if there are none.
  if (!sponsors || sponsors.length === 0) return null;

  return (
    <section style={{ padding: '0 24px 64px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
        paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ width: 22, height: 2, background: color }}/>
        <p style={{
          fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
          textTransform: 'uppercase', letterSpacing: '0.2em',
        }}>
          {sponsors.length === 1 ? 'Partner' : 'Partners'}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${sponsors.length > 2 ? '150px' : '190px'}, 1fr))`,
        gap: 10,
      }}>
        {sponsors.map(s => {
          const inner = (
            <>
              {s.image_url ? (
                /* A white plinth remains the right call — most brand marks are
                   drawn dark-on-white and become unreadable on a dark page. */
                <div style={{
                  background: 'white', borderRadius: 8, height: 62,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image_url} alt={s.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}/>
                </div>
              ) : (
                <div style={{
                  height: 62, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{s.name}</p>
                </div>
              )}

            </>
          );

          const box: React.CSSProperties = {
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.022)', padding: 12,
            textDecoration: 'none', display: 'block',
          };

          return s.sponsor_link
            ? <a key={s.id} href={s.sponsor_link} target="_blank" rel="noopener noreferrer sponsored" style={box}>{inner}</a>
            : <div key={s.id} style={box}>{inner}</div>;
        })}
      </div>
    </section>
  );
}
