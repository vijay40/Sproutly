import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export function todayYmdInTz(tz: string, now: Date = new Date()): string {
  return dayjs(now).tz(tz).format('YYYY-MM-DD');
}

export function ymdAddDays(ymd: string, days: number, tz: string): string {
  return dayjs.tz(ymd, tz).add(days, 'day').format('YYYY-MM-DD');
}

/** Calendar-day difference `a - b` in `tz` (integer days). */
export function ymdDiffDays(a: string, b: string, tz: string): number {
  return dayjs.tz(a, tz).startOf('day').diff(dayjs.tz(b, tz).startOf('day'), 'day');
}
