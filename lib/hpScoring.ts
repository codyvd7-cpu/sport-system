// ─── HP scoring and group assignment logic ─────────────────────────────────────
import { GRADE8_TESTS, GRADE9_TESTS, HPTest } from './hpTests';

type Row = Record<string, any>;

// ── Normalise a raw value to 0–100 (direction-aware) ──────────────────────────
export function normaliseScore(
  val: number,
  lower: boolean,
  min: number,
  max: number
): number {
  if (max === min) return 50;
  const n = (val - min) / (max - min);
  return lower ? (1 - n) * 100 : n * 100;
}

// ── Compute composite score per student ────────────────────────────────────────
export function compositeScore(
  student: Row,
  allStudents: Row[],
  results: Record<string, Row>,
  tests: HPTest[]
): number | null {
  const r = results[student.id] || {};
  let total = 0, count = 0;

  tests.forEach(t => {
    const allVals = allStudents
      .map(s => parseFloat((results[s.id] || {})[t.key]))
      .filter(v => !isNaN(v));
    if (allVals.length < 2) return;
    const val = parseFloat(r[t.key]);
    if (isNaN(val)) return;
    const min = Math.min(...allVals), max = Math.max(...allVals);
    total += normaliseScore(val, t.lower, min, max);
    count++;
  });

  return count > 0 ? total / count : null;
}

// ── Assign students to training groups by composite score ──────────────────────
export function assignTrainingGroups(
  students: Row[],
  results: Record<string, Row>,
  numGroups: number
): Record<string, number> {
  const tests = students[0]?.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;

  const scored = students.map(s => ({
    id:    s.id,
    score: compositeScore(s, students, results, tests),
  }));

  const tested  = scored.filter(s => s.score !== null)
                        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  // Balanced distribution — max difference of 1 student between any two groups
  // e.g. 25 students, 4 groups → [7, 6, 6, 6] not [7, 7, 7, 4]
  const base      = Math.floor(tested.length / numGroups);
  const extra     = tested.length % numGroups;
  const threshold = extra * (base + 1);  // students that go into larger groups

  const groups: Record<string, number> = {};
  tested.forEach((s, i) => {
    let group: number;
    if (i < threshold) {
      group = Math.floor(i / (base + 1)) + 1;
    } else {
      group = extra + Math.floor((i - threshold) / base) + 1;
    }
    groups[s.id] = Math.min(group, numGroups);
  });
  return groups;
}

// ── Group colour palette ────────────────────────────────────────────────────────
export const GROUP_COLORS: Record<number, string> = {
  1: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  2: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  3: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  4: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  5: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

export const GROUP_LABELS: Record<number, string> = {
  1: 'Elite',
  2: 'Advanced',
  3: 'Development',
  4: 'Foundation',
  5: 'Support',
};
