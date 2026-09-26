// ─── Portal Design System ──────────────────────────────────────────────────────
// Shared visual language for every portal component.
//
// REBUILT: the previous system was built on `glassCard()` — 20px radius,
// translucent white gradient, a large soft drop shadow and an inset highlight.
// That is the default "floating glass card" treatment every AI-generated
// dashboard uses, and because every component called it, the whole portal
// inherited the same generic look.
//
// The replacement is editorial rather than app-like: solid, grounded panels
// with a precise hairline border, tighter radii, and no floating shadows.
// Surfaces sit IN the page rather than hovering above it. Depth comes from
// value contrast and spacing, not from blur and glow.

export const PORTAL_BG = 'radial-gradient(ellipse 1400px 900px at 50% -12%, #0b1422 0%, #03070e 58%)';

/**
 * A portal surface. Signature kept identical to the old glassCard() so every
 * existing caller keeps working — only the resulting look changes.
 *
 * `intensity` now controls how far the panel lifts off the background, not
 * how much white haze sits on top of it.
 */
export function glassCard(color: string, intensity: 'low'|'med'|'high' = 'med') {
  const surface =
    intensity === 'low'  ? 'rgba(255,255,255,0.018)' :
    intensity === 'high' ? 'rgba(255,255,255,0.045)' :
                           'rgba(255,255,255,0.028)';
  const line =
    intensity === 'high' ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.075)';

  return {
    // 14px reads as a considered product surface; 20px+ reads as a phone app
    // widget. Small change, disproportionate effect on perceived quality.
    borderRadius: 14,
    border: `1px solid ${line}`,
    background: surface,
    // No drop shadow and no inset highlight — those are what made panels look
    // like they were floating on a desktop wallpaper.
  } as React.CSSProperties;
}

/**
 * An accented panel, for the one or two places that genuinely deserve
 * emphasis. Uses the school's colour as a precise left rule rather than a
 * full-surface wash.
 */
export function accentCard(color: string) {
  return {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.075)',
    borderLeft: `2px solid ${color}`,
    background: 'rgba(255,255,255,0.028)',
  } as React.CSSProperties;
}

/**
 * Section heading. Was a coloured label with a dot; now a short colour rule
 * followed by tight uppercase text — closer to a printed programme than a
 * dashboard widget title.
 */
export function sectionLabel(color: string) {
  return {
    fontSize: 10.5,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.52)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.2em',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  };
}

/** The rule that precedes a section label. */
export function labelRule(color: string) {
  return { width: 22, height: 2, background: color, flexShrink: 0 } as React.CSSProperties;
}

export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
