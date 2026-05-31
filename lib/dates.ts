// Shared date utilities using date-fns
// Use these instead of raw new Date() throughout the app

import {
  format, formatDistanceToNow, parseISO, isToday, isYesterday,
  startOfWeek, endOfWeek, subWeeks, differenceInDays,
  startOfMonth, endOfMonth, subMonths, getMonth, getYear,
  isWithinInterval, addDays,
} from 'date-fns';

// ── Formatting ──────────────────────────────────────────────

// "12 Jan 2026"
export function fDate(d: string | Date): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'd MMM yyyy');
}

// "Mon, 12 Jan"
export function fDateShort(d: string | Date): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'EEE, d MMM');
}

// "12 Jan"
export function fDay(d: string | Date): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'd MMM');
}

// "January 2026"
export function fMonth(d: string | Date): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'MMMM yyyy');
}

// "2026-01"
export function fMonthKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM');
}

// "2026-01-12"
export function fISODate(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

// "3 days ago" / "just now"
export function fRelative(d: string | Date): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDistanceToNow(date, { addSuffix: true });
}

// "Mon" / "Tue" etc
export function fWeekday(d: string | Date): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'EEE');
}

// ── Ranges ──────────────────────────────────────────────────

// Get the start of N weeks ago (for attendance trend)
export function weeksAgo(n: number): string {
  return fISODate(subWeeks(new Date(), n));
}

// Get last N week ranges for trend chart
export function lastNWeeks(n: number): { start: string; end: string; label: string }[] {
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const end   = subWeeks(new Date(), i);
    const start = subWeeks(end, 1);
    weeks.push({
      start: fISODate(addDays(start, 1)),
      end:   fISODate(end),
      label: format(end, 'd MMM'),
    });
  }
  return weeks;
}

// ── Comparisons ─────────────────────────────────────────────

export function daysSince(d: string | Date): number {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return differenceInDays(new Date(), date);
}

export function isThisMonth(d: string | Date): boolean {
  const date = typeof d === 'string' ? parseISO(d) : d;
  const now = new Date();
  return getMonth(date) === getMonth(now) && getYear(date) === getYear(now);
}

export function isLastMonth(d: string | Date): boolean {
  const date = typeof d === 'string' ? parseISO(d) : d;
  const last = subMonths(new Date(), 1);
  return getMonth(date) === getMonth(last) && getYear(date) === getYear(last);
}

// ── Session / HP ────────────────────────────────────────────

export function currentTerm(): string {
  const m = new Date().getMonth() + 1;
  if (m <= 3)  return 'Term 1';
  if (m <= 6)  return 'Term 2';
  if (m <= 9)  return 'Term 3';
  return 'Term 4';
}

export function currentYear(): number {
  return new Date().getFullYear();
}
