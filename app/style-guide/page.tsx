'use client';
import * as React from 'react';

// The living style guide for the Heritage design system. Not user-facing —
// it exists so the system can be seen, reviewed and kept honest as screens are
// rebuilt against it. Visit /style-guide.

export default function StyleGuide() {
  const [accent, setAccent] = React.useState('#1e3a5f');
  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  const schools = [
    { name: 'Ridgemont', c: '#1e3a5f' },
    { name: 'Ashford', c: '#7a2230' },
    { name: 'Heritage Blue', c: '#3b6ea5' },
    { name: 'Forest', c: '#2f5d4f' },
  ];

  return (
    <main style={{ minHeight: '100vh', background: 'var(--h-ink)', padding: '64px 32px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Header */}
        <p className="h-eyebrow">Altus Performance</p>
        <h1 className="h-hero" style={{ marginTop: 8, marginBottom: 12 }}>The Heritage system</h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--t-body)', color: 'var(--h-text-2)', lineHeight: 1.6, maxWidth: '60ch' }}>
          One considered foundation for every screen — grounded in the world of
          established school sport. Restraint is the signal; the school&apos;s own
          colour is the only thing that varies.
        </p>

        {/* Accent switcher */}
        <div style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
          {schools.map(s => (
            <button key={s.c} onClick={() => setAccent(s.c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                borderRadius: 'var(--r-md)', fontFamily: 'var(--font-ui)', fontSize: 'var(--t-sm)',
                border: `1px solid ${accent === s.c ? 'var(--accent-line)' : 'var(--h-line)'}`,
                background: accent === s.c ? 'var(--accent-dim)' : 'transparent',
                color: accent === s.c ? 'var(--h-text)' : 'var(--h-text-2)',
              }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: s.c }} />
              {s.name}
            </button>
          ))}
        </div>

        <hr className="h-rule" style={{ margin: '48px 0' }} />

        {/* Type */}
        <p className="h-eyebrow" style={{ marginBottom: 20 }}>Typography</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h2 className="h-hero">First XV selected</h2>
            <Caption>Hero · Fraunces 600 · page titles, athlete names</Caption>
          </div>
          <div>
            <h3 className="h-title">Return to play</h3>
            <Caption>Title · Fraunces 600 · section heads</Caption>
          </div>
          <div>
            <h4 className="h-head">Saturday&apos;s fixtures</h4>
            <Caption>Heading · Fraunces 600 · card heads</Caption>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--t-body)', color: 'var(--h-text)', lineHeight: 1.6, maxWidth: '62ch' }}>
              Interface and body text is set in Geist — a clean grotesque that
              stays quiet so the serif can carry the personality. Data, labels
              and controls all live here.
            </p>
            <Caption>Body · Geist · 15px · interface & reading</Caption>
          </div>
        </div>

        <hr className="h-rule" style={{ margin: '48px 0' }} />

        {/* Palette */}
        <p className="h-eyebrow" style={{ marginBottom: 20 }}>Palette</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          {[
            ['Ink', 'var(--h-ink)'], ['Ink raised', 'var(--h-ink-2)'],
            ['Ink inset', 'var(--h-ink-inset)'], ['Accent', 'var(--accent)'],
            ['Good', 'var(--h-good)'], ['Warn', 'var(--h-warn)'], ['Alert', 'var(--h-alert)'],
          ].map(([name, v]) => (
            <div key={name} className="h-surface" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 56, background: v }} />
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--t-sm)', color: 'var(--h-text)', fontWeight: 600 }}>{name}</p>
              </div>
            </div>
          ))}
        </div>

        <hr className="h-rule" style={{ margin: '48px 0' }} />

        {/* Surfaces + stat */}
        <p className="h-eyebrow" style={{ marginBottom: 20 }}>Surfaces & figures</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <div className="h-surface" style={{ padding: 20 }}>
            <p className="h-stat-figure">342</p>
            <p className="h-stat-label" style={{ marginTop: 6 }}>Athletes on roster</p>
          </div>
          <div className="h-surface" style={{ padding: 20 }}>
            <p className="h-stat-figure">84<span style={{ fontSize: '1rem', color: 'var(--h-text-3)' }}>%</span></p>
            <p className="h-stat-label" style={{ marginTop: 6 }}>Attendance this term</p>
          </div>
          <div className="h-surface" style={{ padding: 20, borderLeft: '2px solid var(--accent)' }}>
            <p className="h-head" style={{ fontSize: '1rem' }}>Next fixture</p>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--t-sm)', color: 'var(--h-text-2)', marginTop: 6 }}>
              1st XI vs St Stithians · Saturday 09:30
            </p>
          </div>
        </div>

        <hr className="h-rule" style={{ margin: '48px 0' }} />

        {/* Buttons */}
        <p className="h-eyebrow" style={{ marginBottom: 20 }}>Actions</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="h-btn">Publish team</button>
          <button className="h-btn h-btn--ghost">Save draft</button>
        </div>

        <hr className="h-rule" style={{ margin: '48px 0' }} />
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--t-label)', color: 'var(--h-text-4)' }}>
          Heritage system v1 · the foundation every screen is rebuilt on.
        </p>
      </div>
    </main>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--t-label)', color: 'var(--h-text-3)', marginTop: 6 }}>{children}</p>;
}
