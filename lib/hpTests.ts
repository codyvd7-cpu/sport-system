// ─── Shared HP test configuration ─────────────────────────────────────────────
// Single source of truth for all HP pages.
// Import from here — never hardcode test keys, labels or benchmarks elsewhere.

import { currentTerm } from './dates';

export type TestKey =
  | 'chin_up_hang'
  | 'broad_jump'
  | 'sprint_10m'
  | 'sprint_30m'
  | 'run_500m'
  | 'pushup_2min'
  | 'triple_broad_jump';

export interface HPTest {
  key:     TestKey;
  label:   string;
  unit:    string;
  lower:   boolean;   // true = lower is better (sprints, run)
  grade:   '8' | '9' | 'both';
  cat:     'Speed' | 'Power' | 'Strength' | 'Fitness';
}

// ── Test batteries ─────────────────────────────────────────────────────────────
export const GRADE8_TESTS: HPTest[] = [
  { key:'chin_up_hang',  label:'Chin Up Hang',      unit:'s',     lower:false, grade:'8', cat:'Strength' },
  { key:'broad_jump',    label:'Broad Jump',         unit:'cm',    lower:false, grade:'8', cat:'Power'    },
  { key:'sprint_10m',    label:'10m Sprint',         unit:'s',     lower:true,  grade:'8', cat:'Speed'    },
  { key:'sprint_30m',    label:'30m Sprint',         unit:'s',     lower:true,  grade:'8', cat:'Speed'    },
  { key:'run_500m',      label:'500m Run',           unit:'mm:ss', lower:true,  grade:'8', cat:'Fitness'  },
];

export const GRADE9_TESTS: HPTest[] = [
  { key:'pushup_2min',       label:'Push Up (2 min)',   unit:'reps',  lower:false, grade:'9', cat:'Strength' },
  { key:'triple_broad_jump', label:'Triple Broad Jump', unit:'cm',    lower:false, grade:'9', cat:'Power'    },
  { key:'sprint_10m',        label:'10m Sprint',        unit:'s',     lower:true,  grade:'9', cat:'Speed'    },
  { key:'sprint_30m',        label:'30m Sprint',        unit:'s',     lower:true,  grade:'9', cat:'Speed'    },
  { key:'run_500m',          label:'500m Run',          unit:'mm:ss', lower:true,  grade:'9', cat:'Fitness'  },
];

export function getTests(grade: string): HPTest[] {
  return grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
}

// ── Benchmarks: [Outstanding, Strong, On Track, Developing] ───────────────────
export const BENCHMARKS: Record<TestKey, [number, number, number, number]> = {
  chin_up_hang:      [45,  25,  12,  5  ],
  broad_jump:        [185, 165, 148, 130 ],
  sprint_10m:        [1.85,1.97,2.10,2.25],
  sprint_30m:        [4.25,4.52,4.80,5.10],
  run_500m:          [100, 115, 130, 150 ],
  pushup_2min:       [22,  18,  14,  10  ],
  triple_broad_jump: [680, 600, 530, 460 ],
};

// ── Tiers ──────────────────────────────────────────────────────────────────────
export interface Tier {
  abbr:   string;
  label:  string;
  color:  string;   // badge text colour (dark, on light bg)
  bg:     string;   // badge background
  border: string;   // border + value text colour (vivid)
  text?:  string;   // alias for border — kept for backward compat
}

export const TIERS: Tier[] = [
  { abbr:'OUT', label:'Outstanding', color:'#065f46', bg:'#d1fae5', border:'#059669' },
  { abbr:'STR', label:'Strong',      color:'#1e3a8a', bg:'#dbeafe', border:'#2563eb' },
  { abbr:'ON',  label:'On Track',    color:'#4c1d95', bg:'#ede9fe', border:'#7c3aed' },
  { abbr:'DEV', label:'Developing',  color:'#78350f', bg:'#fef3c7', border:'#d97706' },
  { abbr:'NEE', label:'Needs Work',  color:'#134e4a', bg:'#ccfbf1', border:'#0f766e' },
];

export function getTier(key: TestKey, value: number, lower: boolean): Tier {
  const b = BENCHMARKS[key];
  if (!b) return TIERS[2];
  const [e, g, a, d] = b;
  if (lower) {
    if (value <= e) return TIERS[0];
    if (value <= g) return TIERS[1];
    if (value <= a) return TIERS[2];
    if (value <= d) return TIERS[3];
    return TIERS[4];
  } else {
    if (value >= e) return TIERS[0];
    if (value >= g) return TIERS[1];
    if (value >= a) return TIERS[2];
    if (value >= d) return TIERS[3];
    return TIERS[4];
  }
}

// ── Value formatting ────────────────────────────────────────────────────────────
export function fmtValue(key: TestKey, value: number): string {
  if (key === 'run_500m') {
    // Round the WHOLE number of seconds BEFORE splitting — rounding the seconds
    // component alone turned 119.6 into "1:60" (engine review). 120 → "2:00".
    const total = Math.round(value);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  if (key === 'chin_up_hang' && value >= 60) {
    const total = Math.round(value);   // same rounding-before-split fix
    const m = Math.floor(total / 60);
    const s = total % 60;
    return s ? `${m}m${s}s` : `${m}min`;
  }
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

/** Value with its unit, print-safe: never "2:15mm:ss" or "45ss". */
export function fmtValueWithUnit(key: TestKey, value: number): string {
  const v = fmtValue(key, value);
  if (key === 'run_500m') return v;                          // already mm:ss
  if (key === 'chin_up_hang') return value >= 60 ? v : `${v}s`;
  const t = [...GRADE8_TESTS, ...GRADE9_TESTS].find(x => x.key === key);
  return t?.unit ? `${v}${t.unit}` : v;
}

// ── 500m parsing (accepts mm:ss or mm.ss coach shorthand) ─────────────────────
// Strict by design (engine review): a malformed clock like "1:90", a surplus
// component like "2:15:30", or trailing junk must be REJECTED (null), not
// silently coerced. The legitimate coach shorthand "2.15" = 2:15 and a
// canonical seconds value like 119.6 are preserved.
export function parseRunTime(raw: string): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const s = raw.trim();

  if (s.includes(':')) {
    const parts = s.split(':');
    if (parts.length !== 2) return null;                 // reject h:m:s / surplus components
    // minutes: whole number; seconds: up to two digits, optional decimal, 0–59.x
    if (!/^\d+$/.test(parts[0]) || !/^\d{1,2}(\.\d+)?$/.test(parts[1])) return null;
    const m = Number(parts[0]);
    const sec = Number(parts[1]);
    if (sec >= 60) return null;                           // reject "1:90"
    return m * 60 + sec;
  }

  // No colon: must be a bare number (reject "2.1junk"); may be mm.ss shorthand.
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  // Coach shorthand e.g. 2.15 = 2:15 — only for small values with a valid
  // seconds fragment; a canonical seconds value (≥10) is returned as-is.
  if (s.includes('.')) {
    const secPart = parseInt(s.split('.')[1] || '0', 10);
    if (secPart <= 59 && n < 10) return Math.floor(n) * 60 + secPart;
  }
  return n;
}

export function parseTestValue(key: TestKey, raw: string): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  if (key === 'run_500m') return parseRunTime(raw);
  // The ENTIRE input must be a valid finite number — parseFloat alone accepted
  // trailing junk ("2.1junk" → 2.1) (engine review). Comma decimals allowed.
  const cleaned = raw.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ── SA school terms ────────────────────────────────────────────────────────────
export const TERM_ORDER = ['Term 1', 'Term 2', 'Term 3', 'Term 4'] as const;
export type Term = typeof TERM_ORDER[number];

// Delegates to the single term source of truth (lib/dates), which resolves in
// the schools' timezone. Kept as a thin alias so existing HP imports don't move.
export function getCurrentTerm(): Term {
  return currentTerm() as Term;
}

// ── HP class config (Ridgemont — move to DB later) ──────────────────────────────
export const HP_GRADES  = ['Grade 8', 'Grade 9'] as const;
export const HP_CLASSES = ['B', 'E', 'F', 'J', 'M'] as const;
export type HPGrade = typeof HP_GRADES[number];
export type HPClass = typeof HP_CLASSES[number];
