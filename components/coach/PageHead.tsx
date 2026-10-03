'use client';
import * as React from 'react';

// ─── PageHead ──────────────────────────────────────────────────────────────────
// The standard Heritage page header used across the coach screens, so every
// working page opens the same considered way: a small-caps eyebrow, a serif
// title, an optional standfirst, optional actions on the right, and a hairline
// rule. One component means the system is enforced, not re-decided per page.

export default function PageHead({
  eyebrow, title, standfirst, actions,
}: {
  eyebrow?: string;
  title: string;
  standfirst?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 28, paddingTop: 8 }}>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          {eyebrow && <p className="h-eyebrow">{eyebrow}</p>}
          <h1 className="h-hero" style={{ marginTop: eyebrow ? 4 : 0 }}>{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>{actions}</div>}
      </div>
      {standfirst && (
        <p style={{ marginTop: 8, fontFamily: 'var(--font-ui)', fontSize: 'var(--t-sm)', color: 'var(--h-text-3)' }}>
          {standfirst}
        </p>
      )}
      <hr className="h-rule" style={{ marginTop: 18 }} />
    </div>
  );
}
