// HP Term utilities — shared across all HP pages
// SA IEB Private School Calendar (3 terms)

export const HP_TERMS = ['Term 1', 'Term 2', 'Term 3'] as const;
export type HPTerm = typeof HP_TERMS[number];

// SA IEB private school approximate term dates:
// Term 1: ~Jan 20 – ~Apr 10  (ends before Easter)
// Term 2: ~Apr 22 – ~Jun 28
// Term 3: ~Jul 21 – ~Sep 28
export function getCalendarTerm(): HPTerm {
  const now   = new Date();
  const m     = now.getMonth() + 1;  // 1-indexed
  const d     = now.getDate();

  // Term 1: 20 Jan → 10 Apr
  if ((m === 1 && d >= 20) || m === 2 || m === 3 || (m === 4 && d <= 10)) return 'Term 1';
  // Term 2: 22 Apr → 28 Jun
  if ((m === 4 && d >= 22) || m === 5 || m === 6) return 'Term 2';
  // Term 3: 21 Jul → 28 Sep
  if ((m === 7 && d >= 21) || m === 8 || (m === 9 && d <= 28)) return 'Term 3';

  // Holiday periods — return most recent term
  if (m === 4 && d > 10 && d < 22) return 'Term 1'; // Easter break
  if (m === 7 && d < 21)            return 'Term 2'; // July holiday
  if (m >= 10 || (m === 9 && d > 28)) return 'Term 3'; // Oct–Dec holidays/exams
  if (m === 1 && d < 20)            return 'Term 3'; // Jan before school starts

  return 'Term 1';
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Get term date range label
export function getTermDateRange(term: HPTerm): string {
  const ranges: Record<HPTerm, string> = {
    'Term 1': 'Jan – Apr',
    'Term 2': 'Apr – Jun',
    'Term 3': 'Jul – Sep',
  };
  return ranges[term];
}

// Given test results, find the most recent term that has data
export function getLatestTermWithData(
  results: Array<{ term: string; year: number }>,
  year: number
): HPTerm {
  const calendar = getCalendarTerm();
  const yearResults = results.filter(r => r.year === year);

  // Prefer current term if it has data
  if (yearResults.some(r => r.term === calendar)) return calendar;

  // Fall back to most recent term with data
  for (const t of [...HP_TERMS].reverse()) {
    if (yearResults.some(r => r.term === t)) return t;
  }

  return calendar;
}

// Get the previous term
export function prevTerm(t: HPTerm): HPTerm | null {
  const idx = HP_TERMS.indexOf(t);
  return idx > 0 ? HP_TERMS[idx - 1] : null;
}

// Get the next term
export function nextTerm(t: HPTerm): HPTerm | null {
  const idx = HP_TERMS.indexOf(t);
  return idx < HP_TERMS.length - 1 ? HP_TERMS[idx + 1] : null;
}

// Get term from URL param, with fallback to calendar
export function termFromParam(param: string | null): HPTerm {
  if (param && HP_TERMS.includes(param as HPTerm)) return param as HPTerm;
  return getCalendarTerm();
}

// Get year from URL param, with fallback to current year
export function yearFromParam(param: string | null): number {
  const n = parseInt(param || '');
  return isNaN(n) ? getCurrentYear() : n;
}

// Is this term in the future relative to now?
export function isTermFuture(term: HPTerm, year: number): boolean {
  const currentYear = getCurrentYear();
  const currentTerm = getCalendarTerm();
  if (year > currentYear) return true;
  if (year < currentYear) return false;
  return HP_TERMS.indexOf(term) > HP_TERMS.indexOf(currentTerm);
}
