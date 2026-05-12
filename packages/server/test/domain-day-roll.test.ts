import { describe, expect, it } from 'vitest';
import {
  STAGE_THRESHOLDS,
  computeDayRoll,
  computeStageAfterSuccess,
  datesBetween,
  targetStageFromSuccessfulDays,
  wasSuccessful,
  worstTimeSlotForMiss,
} from '../src/domain/day-roll.js';

describe('wasSuccessful', () => {
  it('false when total is 0', () => {
    expect(wasSuccessful(0, 0)).toBe(false);
  });
  it('true at 60%', () => {
    expect(wasSuccessful(5, 3)).toBe(true);
  });
  it('false below 60%', () => {
    expect(wasSuccessful(5, 2)).toBe(false);
  });
});

describe('STAGE_THRESHOLDS', () => {
  it('maps streak thresholds to stages', () => {
    expect(STAGE_THRESHOLDS.get(7)).toBe(2);
    expect(STAGE_THRESHOLDS.get(14)).toBe(3);
    expect(STAGE_THRESHOLDS.get(21)).toBe(4);
    expect(STAGE_THRESHOLDS.get(30)).toBe(5);
  });
  it('targetStageFromSuccessfulDays outside bands', () => {
    expect(targetStageFromSuccessfulDays(6)).toBeUndefined();
    expect(targetStageFromSuccessfulDays(7)).toBe(2);
    expect(targetStageFromSuccessfulDays(13)).toBe(2);
    expect(targetStageFromSuccessfulDays(14)).toBe(3);
  });
});

describe('datesBetween', () => {
  it('null from returns single yesterday', () => {
    expect(datesBetween(null, '2026-05-11', 'America/Los_Angeles')).toEqual(['2026-05-11']);
  });
  it('exclusive start inclusive end', () => {
    expect(datesBetween('2026-05-08', '2026-05-11', 'America/Los_Angeles')).toEqual([
      '2026-05-09',
      '2026-05-10',
      '2026-05-11',
    ]);
  });
  it('same start and end yields empty', () => {
    expect(datesBetween('2026-05-11', '2026-05-11', 'America/Los_Angeles')).toEqual([]);
  });
});

describe('computeStageAfterSuccess', () => {
  it('bumps at 7 from stage 1', () => {
    expect(computeStageAfterSuccess(1, 7)).toEqual({ stage: 2, bumped: true });
  });
  it('no bump at 8 when already stage 2', () => {
    expect(computeStageAfterSuccess(2, 8)).toEqual({ stage: 2, bumped: false });
  });
});

describe('worstTimeSlotForMiss', () => {
  it('all morning zero completions → morning', () => {
    const tasks = [
      { id: 'a', time_slot: 'morning' },
      { id: 'b', time_slot: 'morning' },
    ];
    expect(worstTimeSlotForMiss(tasks, [])).toBe('morning');
  });
  it('tie on ratio prefers morning', () => {
    const tasks = [
      { id: 'a', time_slot: 'morning' },
      { id: 'b', time_slot: 'afternoon' },
    ];
    const comps = [{ task_id: 'a' }, { task_id: 'b' }];
    expect(worstTimeSlotForMiss(tasks, comps)).toBe('morning');
  });
});

describe('computeDayRoll', () => {
  const childBase = { avatar_stage: 1, successful_days: 0, pending_stage_transition: false };

  it('happy path 4 scheduled 3 completed', () => {
    const tasks = [
      { id: '1', time_slot: 'morning', is_bonus: false, is_active: true },
      { id: '2', time_slot: 'morning', is_bonus: false, is_active: true },
      { id: '3', time_slot: 'afternoon', is_bonus: false, is_active: true },
      { id: '4', time_slot: 'evening', is_bonus: false, is_active: true },
    ];
    const comps = [
      { task_id: '1', id: 'c1' },
      { task_id: '2', id: 'c2' },
      { task_id: '3', id: 'c3' },
    ];
    const r = computeDayRoll({
      date: '2026-05-10',
      tasksScheduled: tasks,
      completionsForDate: comps,
      child: childBase,
    });
    expect(r.was_successful).toBe(true);
    expect(r.next_successful_days).toBe(1);
    expect(r.missSimplifyDraft).toBeUndefined();
  });

  it('miss path emits draft', () => {
    const tasks = [
      { id: '1', time_slot: 'morning', is_bonus: false, is_active: true },
      { id: '2', time_slot: 'afternoon', is_bonus: false, is_active: true },
      { id: '3', time_slot: 'evening', is_bonus: false, is_active: true },
      { id: '4', time_slot: 'evening', is_bonus: false, is_active: true },
    ];
    const comps = [{ task_id: '1', id: 'c1' }];
    const r = computeDayRoll({
      date: '2026-05-10',
      tasksScheduled: tasks,
      completionsForDate: comps,
      child: childBase,
    });
    expect(r.was_successful).toBe(false);
    expect(r.next_successful_days).toBe(0);
    expect(r.missSimplifyDraft?.worst_slot).toBe('afternoon');
  });

  it('zero tasks no draft', () => {
    const r = computeDayRoll({
      date: '2026-05-10',
      tasksScheduled: [],
      completionsForDate: [],
      child: childBase,
    });
    expect(r.total_tasks).toBe(0);
    expect(r.was_successful).toBe(false);
    expect(r.missSimplifyDraft).toBeUndefined();
  });

  it('ignores completions for tasks not scheduled', () => {
    const tasks = [{ id: '1', time_slot: 'morning', is_bonus: false, is_active: true }];
    const comps = [
      { task_id: '1', id: 'c1' },
      { task_id: 'bonus-only', id: 'c2' },
    ];
    const r = computeDayRoll({
      date: '2026-05-10',
      tasksScheduled: tasks,
      completionsForDate: comps,
      child: childBase,
    });
    expect(r.completed_tasks).toBe(1);
  });

  it('excludes bonus from scheduled', () => {
    const tasks = [
      { id: '1', time_slot: 'morning', is_bonus: true, is_active: true },
      { id: '2', time_slot: 'morning', is_bonus: false, is_active: true },
    ];
    const r = computeDayRoll({
      date: '2026-05-10',
      tasksScheduled: tasks,
      completionsForDate: [],
      child: childBase,
    });
    expect(r.total_tasks).toBe(1);
  });
});
