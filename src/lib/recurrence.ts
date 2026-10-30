import type { TaskRow } from '../types/db';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Sorted Mon→Sun (weekdays first, weekend last) so labels read naturally. */
const DAY_SORT_ORDER = [1, 2, 3, 4, 5, 6, 0];

function sortedCustomDays(days: number[] | null | undefined): number[] {
  const set = new Set(days ?? []);
  return DAY_SORT_ORDER.filter((d) => set.has(d));
}

function sameDays(days: Set<number>, target: number[]): boolean {
  if (days.size !== target.length) return false;
  return target.every((d) => days.has(d));
}

/**
 * Human-friendly label for a task's recurrence. Normalizes "custom" — if the
 * selected days happen to match `daily` or `weekdays`, we say so; otherwise
 * list the days (e.g. "Mon, Wed, Fri").
 */
export function recurrenceLabel(t: Pick<TaskRow, 'recurrence' | 'recurrence_days'>): string {
  switch (t.recurrence) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Weekdays';
    case 'one_time':
      return 'One time';
    case 'custom': {
      const sorted = sortedCustomDays(t.recurrence_days);
      if (sorted.length === 0) return 'No days';
      const set = new Set(sorted);
      if (sameDays(set, [0, 1, 2, 3, 4, 5, 6])) return 'Every day';
      if (sameDays(set, [1, 2, 3, 4, 5])) return 'Weekdays';
      if (sameDays(set, [0, 6])) return 'Weekends';
      return sorted.map((d) => DAY_SHORT[d]).join(', ');
    }
  }
}
