import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export function toLocalDate(instant: Date, tz: string): string {
  return dayjs(instant).tz(tz).format('YYYY-MM-DD');
}

export function todayLocalDate(tz: string, now: Date = new Date()): string {
  return toLocalDate(now, tz);
}
