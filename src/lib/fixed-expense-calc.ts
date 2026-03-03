/**
 * Fixed expense frequency calculation utility.
 * Works in both server (API routes) and client (React pages) contexts.
 */

export type Frequency = 'monthly' | 'daily' | 'weekly' | 'biweekly' | 'annual';

export interface FixedExpenseForCalc {
  amount: number;
  frequency?: string | null;
  weekdays?: string | null;   // JSON array string, e.g. "[1,3]" (0=Sun..6=Sat)
  annualDate?: string | null;  // "MM-DD" format
  startDate: string;           // "YYYY-MM-DD"
}

/**
 * Returns the number of days in a given month.
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Count how many times a specific weekday (0=Sun..6=Sat) appears in a month.
 */
function countWeekdayOccurrences(year: number, month: number, weekday: number): number {
  const days = daysInMonth(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if ((firstDow + d - 1) % 7 === weekday) count++;
  }
  return count;
}

/**
 * Get the ISO week number of a date.
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Count biweekly occurrences: only count weekday occurrences whose
 * ISO week has the same parity (odd/even) as the startDate's ISO week.
 */
function countBiweeklyOccurrences(
  year: number,
  month: number,
  weekday: number,
  startDate: string
): number {
  const startD = new Date(startDate);
  const startWeekParity = getISOWeek(startD) % 2;

  const days = daysInMonth(year, month);
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === weekday) {
      const weekParity = getISOWeek(date) % 2;
      if (weekParity === startWeekParity) count++;
    }
  }
  return count;
}

/**
 * Calculate the effective monthly amount for a fixed expense
 * based on its frequency, for a given year and month.
 *
 * @param expense - The fixed expense record (or partial with required fields)
 * @param year - The target year (e.g. 2026)
 * @param month - The target month (1-12)
 * @returns The calculated monthly amount in Won
 */
export function calcMonthlyAmount(
  expense: FixedExpenseForCalc,
  year: number,
  month: number
): number {
  const freq = (expense.frequency as Frequency) ?? 'monthly';

  switch (freq) {
    case 'monthly':
      return expense.amount;

    case 'daily':
      return daysInMonth(year, month) * expense.amount;

    case 'weekly': {
      const weekdays: number[] = JSON.parse(expense.weekdays || '[]');
      if (weekdays.length === 0) return 0;
      let total = 0;
      for (const wd of weekdays) {
        total += countWeekdayOccurrences(year, month, wd);
      }
      return total * expense.amount;
    }

    case 'biweekly': {
      const weekdays: number[] = JSON.parse(expense.weekdays || '[]');
      if (weekdays.length === 0) return 0;
      let total = 0;
      for (const wd of weekdays) {
        total += countBiweeklyOccurrences(year, month, wd, expense.startDate);
      }
      return total * expense.amount;
    }

    case 'annual': {
      const annualMM = expense.annualDate?.slice(0, 2);
      return annualMM === String(month).padStart(2, '0') ? expense.amount : 0;
    }

    default:
      return expense.amount;
  }
}
