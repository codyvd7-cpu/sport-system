// ─── Shared formatting utilities ─────────────────────────────────────────────────
// Consolidates fTime (was duplicated across 5 files) and match-outcome logic
// (was duplicated across 3 files, one further split into outcome+outcomeColor).
// Each had tiny call-site differences (default value, NaN guards) — preserved
// here via parameters so migrating callers doesn't change visible output.

/**
 * 12-hour time from "HH:MM" (e.g. "14:30" → "2:30pm").
 * Returns `fallback` for missing or unparseable input (default: '').
 */
export function fmtTime12h(t?: string | null, fallback = ''): string {
  if (!t) return fallback;
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  if (isNaN(hr)) return fallback || t;
  return `${hr > 12 ? hr - 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`;
}

export type MatchOutcome = 'WIN' | 'LOSS' | 'DRAW' | null;

/** Derives WIN/LOSS/DRAW from a "12-9" / "12–9" style score string. */
export function matchOutcome(score?: string | null): MatchOutcome {
  if (!score) return null;
  const p = score.split(/[-–]/).map(x => parseInt(x.trim(), 10));
  if (p.length !== 2 || p.some(isNaN)) return null;
  return p[0] > p[1] ? 'WIN' : p[0] < p[1] ? 'LOSS' : 'DRAW';
}

export const OUTCOME_COLOR: Record<'WIN' | 'LOSS' | 'DRAW', string> = {
  WIN: '#22c55e', LOSS: '#f87171', DRAW: '#fbbf24',
};

/** Color for a match outcome, or null (used where "no result yet" needs distinct handling). */
export function outcomeColor(o: MatchOutcome): string | null {
  return o ? OUTCOME_COLOR[o] : null;
}
