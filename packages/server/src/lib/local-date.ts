import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export function todayYmdInTz(tz: string): string {
  return dayjs().tz(tz).format('YYYY-MM-DD');
}

export function ymdAddDays(ymd: string, days: number, tz: string): string {
  return dayjs.tz(ymd, tz).add(days, 'day').format('YYYY-MM-DD');
}
