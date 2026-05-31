// HP Term utilities — St Benedict's College exact term dates
// Source: official school calendar

export const HP_TERMS = ['Term 1', 'Term 2', 'Term 3'] as const;
export type HPTerm = typeof HP_TERMS[number];

interface TermDate {
  start: { month: number; day: number };
  end:   { month: number; day: number };
}

// Exact term dates per year
const TERM_DATES: Record<number, Record<HPTerm, TermDate>> = {
  2026: {
    'Term 1': { start: { month: 1,  day: 14 }, end: { month: 4,  day: 10 } },
    'Term 2': { start: { month: 5,  day: 6  }, end: { month: 8,  day: 7  } },
    'Term 3': { start: { month: 9,  day: 9  }, end: { month: 12, day: 4  } },
  },
  2027: {
    'Term 1': { start: { month: 1,  day: 13 }, end: { month: 4,  day: 9  } },
    'Term 2': { start: { month: 5,  day: 5  }, end: { month: 8,  day: 6  } },
    'Term 3': { start: { month: 9,  day: 7  }, end: { month: 12, day: 3  } },
  },
};

function isOnOrAfter(m: number, d: number, startMonth: number, startDay: number): boolean {
  return m > startMonth || (m === startMonth && d >= startDay);
}

function isOnOrBefore(m: number, d: number, endMonth: number, endDay: number): boolean {
  return m < endMonth || (m === endMonth && d <= endDay);
}

export function getCalendarTerm(date: Date = new Date()): HPTerm {
  const year = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  const dates = TERM_DATES[year];

  if (dates) {
    for (const term of HP_TERMS) {
      const { start, end } = dates[term];
      if (isOnOrAfter(m, d, start.month, start.day) && isOnOrBefore(m, d, end.month, end.day)) {
        return term;
      }
    }
    // In a holiday — return the most recently ended term
    // Check which term we're after
    for (const term of [...HP_TERMS].reverse()) {
      const { start } = dates[term];
      if (isOnOrAfter(m, d, start.month, start.day)) return term;
    }
    return 'Term 1';
  }

  // Fallback for years without exact data — use approximate ranges
  if (m <= 4) return 'Term 1';
  if (m <= 8) return 'Term 2';
  return 'Term 3';
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Get term start/end dates for a given year
export function getTermDates(term: HPTerm, year: number): TermDate | null {
  return TERM_DATES[year]?.[term] ?? null;
}

// Get readable date range string
export function getTermDateRange(term: HPTerm, year?: number): string {
  const y = year ?? getCurrentYear();
  const dates = TERM_DATES[y];
  if (!dates) {
    const fallback: Record<HPTerm, string> = {
      'Term 1': 'Jan – Apr',
      'Term 2': 'May – Aug',
      'Term 3': 'Sep – Dec',
    };
    return fallback[term];
  }
  const { start, end } = dates[term];
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${start.day} ${months[start.month]} – ${end.day} ${months[end.month]}`;
}

// Given test results, find the most recent term that has data
export function getLatestTermWithData(
  results: Array<{ term: string; year: number }>,
  year: number
): HPTerm {
  const calendar = getCalendarTerm();
  const yearResults = results.filter(r => r.year === year);

  if (yearResults.some(r => r.term === calendar)) return calendar;

  for (const t of [...HP_TERMS].reverse()) {
    if (yearResults.some(r => r.term === t)) return t;
  }

  return calendar;
}

export function prevTerm(t: HPTerm): HPTerm | null {
  const idx = HP_TERMS.indexOf(t);
  return idx > 0 ? HP_TERMS[idx - 1] : null;
}

export function nextTerm(t: HPTerm): HPTerm | null {
  const idx = HP_TERMS.indexOf(t);
  return idx < HP_TERMS.length - 1 ? HP_TERMS[idx + 1] : null;
}

export function termFromParam(param: string | null): HPTerm {
  if (param && HP_TERMS.includes(param as HPTerm)) return param as HPTerm;
  return getCalendarTerm();
}

export function yearFromParam(param: string | null): number {
  const n = parseInt(param || '');
  return isNaN(n) ? getCurrentYear() : n;
}

export function isTermFuture(term: HPTerm, year: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentTerm = getCalendarTerm(now);
  if (year > currentYear) return true;
  if (year < currentYear) return false;
  return HP_TERMS.indexOf(term) > HP_TERMS.indexOf(currentTerm);
}
