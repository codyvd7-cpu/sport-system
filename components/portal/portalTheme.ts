// ─── Portal Design System ──────────────────────────────────────────────────────
// Shared visual language for every portal component.

export const PORTAL_BG = 'radial-gradient(ellipse 1200px 800px at 50% -10%, #0d1628 0%, #030810 55%)';

export function glassCard(color: string, intensity: 'low'|'med'|'high' = 'med') {
  const alpha = intensity === 'low' ? 0.03 : intensity === 'high' ? 0.08 : 0.05;
  return {
    borderRadius: 20,
    border: `1px solid rgba(255,255,255,${intensity === 'high' ? 0.14 : 0.09})`,
    background: `linear-gradient(155deg, rgba(255,255,255,${alpha}), rgba(255,255,255,${alpha * 0.3}))`,
    boxShadow: '0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
  } as React.CSSProperties;
}

export function sectionLabel(color: string) {
  return {
    fontSize: 11, fontWeight: 800, color,
    textTransform: 'uppercase' as const, letterSpacing: '0.22em',
    display: 'flex', alignItems: 'center', gap: 8,
  };
}

export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
