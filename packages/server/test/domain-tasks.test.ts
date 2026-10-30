import { describe, expect, it } from 'vitest';
import { isTaskScheduledOn, type TaskRowLike } from '../src/domain/tasks.js';

const base: TaskRowLike = {
  id: 't1',
  child_id: 'c1',
  title: 'X',
  icon: null,
  category: 'routine',
  time_slot: 'morning',
  difficulty: 1,
  is_bonus: false,
  is_active: true,
  created_at: '2026-05-01T00:00:00Z',
};

describe('server isTaskScheduledOn (mirror of app)', () => {
  it('inactive is false', () => {
    expect(isTaskScheduledOn({ ...base, is_active: false, recurrence: 'daily' }, new Date('2026-05-04T12:00:00Z'), 'UTC')).toBe(
      false,
    );
  });
  it('daily', () => {
    expect(isTaskScheduledOn({ ...base, recurrence: 'daily', recurrence_days: null }, new Date('2026-05-04T12:00:00Z'), 'UTC')).toBe(
      true,
    );
  });
  it('weekdays', () => {
    expect(isTaskScheduledOn({ ...base, recurrence: 'weekdays', recurrence_days: null }, new Date('2026-05-02T12:00:00Z'), 'UTC')).toBe(
      false,
    );
    expect(isTaskScheduledOn({ ...base, recurrence: 'weekdays', recurrence_days: null }, new Date('2026-05-04T12:00:00Z'), 'UTC')).toBe(
      true,
    );
  });
});
