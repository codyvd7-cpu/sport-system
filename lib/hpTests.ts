// ─── Shared HP test configuration ─────────────────────────────────────────────
// Single source of truth for all HP pages.
// Import from here — never hardcode test keys, labels or benchmarks elsewhere.

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
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  if (key === 'chin_up_hang' && value >= 60) {
    const m = Math.floor(value / 60);
    const s = value % 60;
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
export function parseRunTime(raw: string): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const s = raw.trim();
  if (s.includes(':')) {
    const [m, sec] = s.split(':').map(Number);
    if (isNaN(m) || isNaN(sec)) return null;
    return m * 60 + sec;
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  // mm.ss shorthand e.g. 2.15 = 2:15
  if (s.includes('.')) {
    const secPart = parseInt(s.split('.')[1] || '0');
    if (secPart <= 59 && n < 10) return Math.floor(n) * 60 + secPart;
  }
  return n;
}

export function parseTestValue(key: TestKey, raw: string): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  if (key === 'run_500m') return parseRunTime(raw);
  const n = parseFloat(raw.replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ── SA school terms ────────────────────────────────────────────────────────────
export const TERM_ORDER = ['Term 1', 'Term 2', 'Term 3', 'Term 4'] as const;
export type Term = typeof TERM_ORDER[number];

export function getCurrentTerm(): Term {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return 'Term 1';
  if (month <= 7) return 'Term 2';   // July = holidays between T2/T3
  if (month <= 9) return 'Term 3';
  return 'Term 4';
}

// ── HP class config (Bennies — move to DB later) ──────────────────────────────
export const HP_GRADES  = ['Grade 8', 'Grade 9'] as const;
export const HP_CLASSES = ['B', 'E', 'F', 'J', 'M'] as const;
export type HPGrade = typeof HP_GRADES[number];
export type HPClass = typeof HP_CLASSES[number];
