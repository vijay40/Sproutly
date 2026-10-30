import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Keep aligned with `src/domain/tasks.ts` (device). */
export interface TaskRowLike {
  id: string;
  child_id: string;
  title: string;
  icon: string | null;
  category: 'routine' | 'chore' | 'behavior';
  time_slot: 'morning' | 'afternoon' | 'evening';
  difficulty: number;
  recurrence: 'daily' | 'weekdays' | 'custom' | 'one_time';
  recurrence_days: number[] | null;
  is_bonus: boolean;
  is_active: boolean;
  created_at: string;
}

export function isTaskScheduledOn(task: TaskRowLike, instant: Date, familyTz: string): boolean {
  if (!task.is_active) return false;

  const localDay = dayjs(instant).tz(familyTz).day();

  switch (task.recurrence) {
    case 'daily':
      return true;
    case 'weekdays':
      return localDay >= 1 && localDay <= 5;
    case 'custom':
      return Array.isArray(task.recurrence_days) && task.recurrence_days.includes(localDay);
    case 'one_time': {
      const createdLocalDate = dayjs(task.created_at).tz(familyTz).format('YYYY-MM-DD');
      const instantLocalDate = dayjs(instant).tz(familyTz).format('YYYY-MM-DD');
      return createdLocalDate === instantLocalDate;
    }
  }
}
