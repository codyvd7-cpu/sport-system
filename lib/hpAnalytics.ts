// ─── HP Analytics ───────────────────────────────────────────────────────────────
// Sports-science statistics for the HP module. Pure functions, no I/O.
//
// Key concept — SWC (Smallest Worthwhile Change), Hopkins method:
//   SWC = 0.2 × between-athlete standard deviation.
//   A change smaller than the SWC is within normal test-to-test variation and
//   should NOT be reported as real improvement or decline. Only changes beyond
//   the SWC are "meaningful". This is the standard used in S&C practice.

import { HPTest, TestKey, getTier } from './hpTests';

type Row = Record<string, any>;

const TERM_ORD: Record<string, number> = { 'Term 1': 1, 'Term 2': 2, 'Term 3': 3, 'Term 4': 4 };

// ── Basic statistics ────────────────────────────────────────────────────────────
export function mean(v: number[]): number {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

/** Sample standard deviation (n-1). Returns 0 for n < 2. */
export function sd(v: number[]): number {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
}

export function median(v: number[]): number {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Smallest Worthwhile Change: 0.2 × between-athlete SD. */
export function swc(values: number[]): number {
  return 0.2 * sd(values);
}

/**
 * Percentile rank within a cohort, direction-aware: always "beats X% of the
 * cohort" regardless of whether lower or higher is better.
 * Returns null when the cohort is too small to be meaningful.
 */
export function percentileRank(values: number[], val: number, lower: boolean): number | null {
  if (values.length < 3) return null;
  const beats = values.filter(x => (lower ? val < x : val > x)).length;
  const ties = values.filter(x => x === val).length;
  return Math.round(((beats + 0.5 * ties) / values.length) * 100);
}

// ── Change classification ───────────────────────────────────────────────────────
export type ChangeClass = 'improved' | 'declined' | 'stable';

/**
 * Classify a change from prev → latest against the cohort SWC.
 * Direction-aware: for lower-is-better tests, a drop in value is improvement.
 */
export function classifyChange(prev: number, latest: number, swcVal: number, lower: boolean): ChangeClass {
  const delta = lower ? prev - latest : latest - prev; // positive = better
  if (swcVal <= 0) return delta === 0 ? 'stable' : delta > 0 ? 'improved' : 'declined';
  if (delta > swcVal) return 'improved';
  if (delta < -swcVal) return 'declined';
  return 'stable';
}

// ── Series extraction ───────────────────────────────────────────────────────────
/** Term-ordered series of numeric values for one student / test / year. */
export function termSeries(results: Row[], studentId: string, key: string, year: number) {
  return results
    .filter(r => r.student_id === studentId && r.year === year && r[key] != null && !isNaN(parseFloat(r[key])))
    .sort((a, b) => (TERM_ORD[a.term] ?? 0) - (TERM_ORD[b.term] ?? 0))
    .map(r => ({ term: r.term as string, val: parseFloat(r[key]) }));
}

// ── Cohort statistics per test (latest value per student) ───────────────────────
export interface TestCohortStats {
  key: string;
  values: number[]; // latest value per tested student
  mean: number;
  median: number;
  sd: number;
  swc: number;
}

export function cohortStats(students: Row[], results: Row[], tests: HPTest[], year: number): Record<string, TestCohortStats> {
  const out: Record<string, TestCohortStats> = {};
  tests.forEach(t => {
    const values = students
      .map(s => {
        const ser = termSeries(results, s.id, t.key, year);
        return ser.length ? ser[ser.length - 1].val : null;
      })
      .filter((v): v is number => v !== null);
    out[t.key] = { key: t.key, values, mean: mean(values), median: median(values), sd: sd(values), swc: swc(values) };
  });
  return out;
}

// ── Movement summary (latest vs previous term, SWC-classified) ──────────────────
export interface MovementSummary {
  improved: number;   // meaningful improvements (beyond SWC)
  declined: number;   // meaningful declines
  stable: number;     // within normal variation
  comparisons: number; // result pairs compared
  perTest: Array<{ key: string; label: string; improved: number; declined: number; stable: number }>;
}

export function movementSummary(students: Row[], results: Row[], tests: HPTest[], year: number): MovementSummary {
  const stats = cohortStats(students, results, tests, year);
  const perTest = tests.map(t => {
    let improved = 0, declined = 0, stable = 0;
    students.forEach(s => {
      const ser = termSeries(results, s.id, t.key, year);
      if (ser.length < 2) return;
      const c = classifyChange(ser[ser.length - 2].val, ser[ser.length - 1].val, stats[t.key].swc, t.lower);
      if (c === 'improved') improved++;
      else if (c === 'declined') declined++;
      else stable++;
    });
    return { key: t.key, label: t.label, improved, declined, stable };
  });
  const improved = perTest.reduce((a, t) => a + t.improved, 0);
  const declined = perTest.reduce((a, t) => a + t.declined, 0);
  const stable = perTest.reduce((a, t) => a + t.stable, 0);
  return { improved, declined, stable, comparisons: improved + declined + stable, perTest };
}

// ── Top movers (average standardised change across tests) ───────────────────────
export interface Mover { id: string; name: string; avgZ: number; testCount: number; }

export function topMovers(students: Row[], results: Row[], tests: HPTest[], year: number, n = 3): { up: Mover[]; down: Mover[] } {
  const stats = cohortStats(students, results, tests, year);
  const rows: Mover[] = [];
  students.forEach(s => {
    let sum = 0, c = 0;
    tests.forEach(t => {
      const dev = stats[t.key].sd;
      if (dev <= 0) return;
      const ser = termSeries(results, s.id, t.key, year);
      if (ser.length < 2) return;
      const prev = ser[ser.length - 2].val, latest = ser[ser.length - 1].val;
      sum += (t.lower ? prev - latest : latest - prev) / dev; // z-scored change, positive = better
      c++;
    });
    if (c > 0) rows.push({ id: s.id, name: s.full_name, avgZ: sum / c, testCount: c });
  });
  const sorted = [...rows].sort((a, b) => b.avgZ - a.avgZ);
  return {
    up: sorted.slice(0, n).filter(r => r.avgZ > 0.1),
    down: sorted.slice(-n).reverse().filter(r => r.avgZ < -0.1),
  };
}

// ── Watch list (who needs coach attention) ──────────────────────────────────────
export interface WatchEntry { id: string; name: string; reasons: string[]; }

export function watchList(students: Row[], results: Row[], tests: HPTest[], year: number, max = 6): WatchEntry[] {
  const stats = cohortStats(students, results, tests, year);
  const entries: WatchEntry[] = [];
  students.forEach(s => {
    let declines = 0, lowTiers = 0;
    tests.forEach(t => {
      const ser = termSeries(results, s.id, t.key, year);
      if (ser.length >= 2) {
        const c = classifyChange(ser[ser.length - 2].val, ser[ser.length - 1].val, stats[t.key].swc, t.lower);
        if (c === 'declined') declines++;
      }
      if (ser.length >= 1) {
        const tier = getTier(t.key as TestKey, ser[ser.length - 1].val, t.lower);
        if (tier.label === 'Needs Work') lowTiers++;
      }
    });
    const reasons: string[] = [];
    if (declines >= 2) reasons.push(`Meaningful decline in ${declines} tests`);
    if (lowTiers >= 2) reasons.push(`Needs Work tier in ${lowTiers} tests`);
    if (reasons.length) entries.push({ id: s.id, name: s.full_name, reasons });
  });
  // Most concerning first: more reasons, then alphabetical
  return entries.sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name)).slice(0, max);
}
