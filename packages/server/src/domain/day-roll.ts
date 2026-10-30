import { ymdAddDays } from '../lib/local-date.js';

export const SUCCESS_THRESHOLD = 0.6;

/** successful_days AFTER increment → stage for that streak. */
export const STAGE_THRESHOLDS: ReadonlyMap<number, number> = new Map([
  [7, 2],
  [14, 3],
  [21, 4],
  [30, 5],
]);

/** Current stage derived from `successful_days` (1–5). */
export function stageFromSuccessfulDays(successfulDays: number): number {
  return targetStageFromSuccessfulDays(successfulDays) ?? 1;
}

export function datesBetween(fromExclusive: string | null, toInclusive: string, tz: string): string[] {
  if (fromExclusive === null) {
    return [toInclusive];
  }
  if (fromExclusive >= toInclusive) {
    return [];
  }
  const out: string[] = [];
  let d = ymdAddDays(fromExclusive, 1, tz);
  while (d <= toInclusive) {
    out.push(d);
    d = ymdAddDays(d, 1, tz);
  }
  return out;
}

export function wasSuccessful(total: number, completed: number): boolean {
  return total > 0 && completed / total >= SUCCESS_THRESHOLD;
}

export function targetStageFromSuccessfulDays(sdAfterIncrement: number): number | undefined {
  if (sdAfterIncrement >= 30) return 5;
  if (sdAfterIncrement >= 21) return 4;
  if (sdAfterIncrement >= 14) return 3;
  if (sdAfterIncrement >= 7) return 2;
  return undefined;
}

const SLOT_ORDER: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];

export function worstTimeSlotForMiss(
  tasksForDate: Array<{ id: string; time_slot: string }>,
  completionsForDate: Array<{ task_id: string }>,
): 'morning' | 'afternoon' | 'evening' | null {
  if (tasksForDate.length === 0) return null;
  const completedSet = new Set(completionsForDate.map((c) => c.task_id));
  type Slot = 'morning' | 'afternoon' | 'evening';
  const stats: Record<Slot, { total: number; done: number }> = {
    morning: { total: 0, done: 0 },
    afternoon: { total: 0, done: 0 },
    evening: { total: 0, done: 0 },
  };
  for (const t of tasksForDate) {
    const slot = t.time_slot as Slot;
    if (!stats[slot]) continue;
    stats[slot].total += 1;
    if (completedSet.has(t.id)) stats[slot].done += 1;
  }

  let candidate: Slot | null = null;
  let worstRatio = -1;

  for (const slot of SLOT_ORDER) {
    const { total, done } = stats[slot];
    if (total === 0) continue;
    const ratio = done / total;
    if (candidate === null) {
      candidate = slot;
      worstRatio = ratio;
      continue;
    }
    if (ratio < worstRatio - 1e-12) {
      candidate = slot;
      worstRatio = ratio;
    } else if (Math.abs(ratio - worstRatio) <= 1e-12) {
      if (SLOT_ORDER.indexOf(slot) < SLOT_ORDER.indexOf(candidate)) {
        candidate = slot;
      }
    }
  }
  return candidate;
}

export type DayRollInput = {
  date: string;
  tasksScheduled: Array<{ id: string; time_slot: string; is_bonus: boolean; is_active: boolean }>;
  completionsForDate: Array<{ task_id: string; id: string }>;
  child: {
    successful_days: number;
    pending_stage_transition: boolean;
  };
};

export type DayRollOutput = {
  date: string;
  total_tasks: number;
  completed_tasks: number;
  was_successful: boolean;
  next_successful_days: number;
  next_stage: number;
  stage_bumped: boolean;
  next_pending_stage_transition: boolean;
  missSimplifyDraft?: { worst_slot: 'morning' | 'afternoon' | 'evening' };
};

export function computeDayRoll(input: DayRollInput): DayRollOutput {
  const scheduled = input.tasksScheduled.filter((t) => t.is_active && !t.is_bonus);
  const scheduledIds = new Set(scheduled.map((t) => t.id));
  const completedTaskIds = new Set(
    input.completionsForDate.filter((c) => scheduledIds.has(c.task_id)).map((c) => c.task_id),
  );
  const total = scheduled.length;
  const completed = completedTaskIds.size;

  const success = wasSuccessful(total, completed);
  const currentSd = input.child.successful_days;
  const nextSd = success ? currentSd + 1 : currentSd;

  const prevStage = stageFromSuccessfulDays(currentSd);
  const nextStage = stageFromSuccessfulDays(nextSd);
  let stageBumped = false;
  let nextPending = input.child.pending_stage_transition;

  if (success) {
    stageBumped = nextStage > prevStage;
    if (stageBumped) nextPending = true;
  }

  const out: DayRollOutput = {
    date: input.date,
    total_tasks: total,
    completed_tasks: completed,
    was_successful: success,
    next_successful_days: nextSd,
    next_stage: nextStage,
    stage_bumped: stageBumped,
    next_pending_stage_transition: nextPending,
  };

  if (!success && total > 0) {
    const slot = worstTimeSlotForMiss(scheduled, input.completionsForDate);
    if (slot) out.missSimplifyDraft = { worst_slot: slot };
  }

  return out;
}
