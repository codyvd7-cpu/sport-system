'use client';
import * as React from 'react';

// ─── Heritage polish primitives ────────────────────────────────────────────────
// The small, consistent pieces that make the app feel finished rather than
// assembled. Empty states, loading states and section headings done once, well,
// so every screen uses the same considered treatment instead of 44 ad-hoc ones.

/**
 * A considered empty state. Not an afterthought — a calm line of serif with a
 * quiet explanation, and an optional action. The thing a coach sees before
 * there's any data is part of the product's first impression.
 */
export function EmptyState({
  title, body, action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      border: '1px solid var(--h-line)', borderRadius: 'var(--r-lg)',
      padding: '56px 28px', textAlign: 'center', background: 'var(--h-ink-2)',
    }}>
      {/* A hairline mark rather than a cartoon icon — restraint. */}
      <div style={{ width: 32, height: 1, background: 'var(--h-line-strong)', margin: '0 auto 20px' }} />
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--h-text-2)' }}>
        {title}
      </p>
      {body && (
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--t-sm)', color: 'var(--h-text-3)', marginTop: 8, maxWidth: '40ch', marginInline: 'auto', lineHeight: 1.6 }}>
          {body}
        </p>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

/**
 * Loading — a single quiet line, not a spinner. Spinners read as "waiting";
 * a calm line reads as "this is composed". Used for section-level loads.
 */
export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <span style={{
        fontFamily: 'var(--font-ui)', fontSize: 'var(--t-sm)', color: 'var(--h-text-3)',
        display: 'inline-flex', alignItems: 'center', gap: 10,
      }}>
        <span className="h-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
        {label}…
      </span>
    </div>
  );
}

/**
 * A section heading — serif, with an optional count and a hairline under it.
 * The consistent way to open a block on any rebuilt screen.
 */
export function SectionHead({
  children, count, action,
}: {
  children: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--h-line)',
    }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--h-text)' }}>
        {children}
        {count !== undefined && (
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--t-sm)', fontWeight: 500, color: 'var(--h-text-3)', marginLeft: 10 }}>
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}
