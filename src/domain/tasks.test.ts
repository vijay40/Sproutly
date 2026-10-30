import { describe, expect, it } from 'vitest';
import { isTaskScheduledOn, TaskRowLike } from './tasks';

const base = {
  id: 't1',
  child_id: 'c1',
  title: 'X',
  icon: null,
  category: 'routine' as const,
  time_slot: 'morning' as const,
  difficulty: 1,
  is_bonus: false,
  is_active: true,
  created_at: '2026-05-01T00:00:00Z',
};

describe('isTaskScheduledOn', () => {
  it('returns false for inactive tasks', () => {
    const task: TaskRowLike = { ...base, is_active: false, recurrence: 'daily', recurrence_days: null };
    expect(isTaskScheduledOn(task, new Date('2026-05-04T12:00:00Z'), 'UTC')).toBe(false);
  });

  it('daily always schedules', () => {
    const task: TaskRowLike = { ...base, recurrence: 'daily', recurrence_days: null };
    expect(isTaskScheduledOn(task, new Date('2026-05-04T12:00:00Z'), 'UTC')).toBe(true);
  });

  it('weekdays excludes Saturday and Sunday in family TZ', () => {
    const task: TaskRowLike = { ...base, recurrence: 'weekdays', recurrence_days: null };
    // 2026-05-02 is a Saturday UTC
    expect(isTaskScheduledOn(task, new Date('2026-05-02T12:00:00Z'), 'UTC')).toBe(false);
    // 2026-05-04 is a Monday UTC
    expect(isTaskScheduledOn(task, new Date('2026-05-04T12:00:00Z'), 'UTC')).toBe(true);
  });

  it('custom uses recurrence_days (0=Sun..6=Sat) in family TZ', () => {
    const task: TaskRowLike = {
      ...base,
      recurrence: 'custom',
      recurrence_days: [2, 4], // Tue and Thu
    };
    // 2026-05-05 is Tuesday UTC
    expect(isTaskScheduledOn(task, new Date('2026-05-05T12:00:00Z'), 'UTC')).toBe(true);
    // 2026-05-06 is Wednesday UTC
    expect(isTaskScheduledOn(task, new Date('2026-05-06T12:00:00Z'), 'UTC')).toBe(false);
  });

  it('one_time schedules only on the created_at date in family TZ', () => {
    const task: TaskRowLike = {
      ...base,
      recurrence: 'one_time',
      recurrence_days: null,
      created_at: '2026-05-04T10:00:00Z',
    };
    expect(isTaskScheduledOn(task, new Date('2026-05-04T12:00:00Z'), 'UTC')).toBe(true);
    expect(isTaskScheduledOn(task, new Date('2026-05-05T12:00:00Z'), 'UTC')).toBe(false);
  });

  it('respects family timezone for "what day it is"', () => {
    // 2026-05-04 23:30 UTC is 2026-05-05 05:00 Asia/Kolkata
    const task: TaskRowLike = {
      ...base,
      recurrence: 'custom',
      recurrence_days: [2], // Tuesday only
    };
    // In UTC that moment is Monday; in Kolkata it's Tuesday.
    expect(isTaskScheduledOn(task, new Date('2026-05-04T23:30:00Z'), 'UTC')).toBe(false);
    expect(isTaskScheduledOn(task, new Date('2026-05-04T23:30:00Z'), 'Asia/Kolkata')).toBe(true);
  });
});
