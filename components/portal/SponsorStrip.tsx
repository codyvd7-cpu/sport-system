'use client';
import * as React from 'react';

// ─── SponsorStrip ──────────────────────────────────────────────────────────────
// A school's commercial partners.
//
// REBUILT. This component previously had FOUR SPONSORS HARDCODED IN THE
// SOURCE — the original pilot school's partners — so every school on the
// platform displayed another school's commercial relationships. That is a
// genuine problem, not a cosmetic one: it misrepresents a sponsorship that
// doesn't exist, to that school's own parents.
//
// Sponsors now come from school_sponsors, scoped per school. A school with
// no sponsors renders NOTHING — an empty "Our Partners" heading, or worse
// invented logos, is more damaging than simply not having the section.
//
// The presentation also dropped the hover lift and the shine sweep that
// travelled across each logo. A sponsor's mark should sit still and be
// legible; animating it is the sort of thing that reads as a template.

type Sponsor = { id: string; name: string; logo_url: string | null; website_url: string | null; tier: string };

export default function SponsorStrip({ color, schoolId }: { color: string; schoolId?: string | null }) {
  const [sponsors, setSponsors] = React.useState<Sponsor[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let stop = false;
    const slugFromPath = window.location.pathname.match(/^\/([^/]+)\/portal/)?.[1];
    const slug = slugFromPath || new URLSearchParams(window.location.search).get('school');
    const qs = schoolId ? `schoolId=${encodeURIComponent(schoolId)}` : slug ? `school=${encodeURIComponent(slug)}` : '';
    if (!qs) { setLoaded(true); return; }

    fetch(`/api/school/sponsors?${qs}`)
      .then(r => r.json())
      .then(d => { if (!stop) { setSponsors(d.sponsors || []); setLoaded(true); } })
      .catch(() => { if (!stop) setLoaded(true); });
    return () => { stop = true; };
  }, [schoolId]);

  // Nothing at all until we know, and nothing at all if there are none.
  if (!loaded || sponsors.length === 0) return null;

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
              {s.logo_url ? (
                /* A white plinth remains the right call — most brand marks are
                   drawn dark-on-white and become unreadable on a dark page. */
                <div style={{
                  background: 'white', borderRadius: 8, height: 62,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.logo_url} alt={s.name}
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
              {s.tier === 'principal' && (
                <p style={{
                  fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase',
                  letterSpacing: '0.16em', marginTop: 8, textAlign: 'center',
                }}>
                  Principal partner
                </p>
              )}
            </>
          );

          const box: React.CSSProperties = {
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.022)', padding: 12,
            textDecoration: 'none', display: 'block',
          };

          return s.website_url
            ? <a key={s.id} href={s.website_url} target="_blank" rel="noopener noreferrer sponsored" style={box}>{inner}</a>
            : <div key={s.id} style={box}>{inner}</div>;
        })}
      </div>
    </section>
  );
}
