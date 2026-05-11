import type { ChildRow, FamilyRow, TaskCompletionRow, TaskRow } from '../types/db';
import type { GreetingSlot } from '../lib/greetingSlot';

export type { GreetingSlot };

export interface KidStateInput {
  child: ChildRow;
  family: FamilyRow;
  /** Today's scheduled, non-bonus tasks (caller filters; max 3). */
  tasks: TaskRow[];
  /** Today's completions for this child. */
  completions: TaskCompletionRow[];
  pendingEvolution: { fromStage: number; toStage: number } | null;
  network: 'online' | 'offline';
  greetingSlot: GreetingSlot | null;
  /** Most recent completion event received; caller clears after ~2s. */
  lastEvent: { kind: 'completion'; taskId: string; at: number } | null;
  simplifiedToday: boolean;
}

export type KidState =
  | { kind: 'greeting';    child: ChildRow }
  | { kind: 'today';       tasks: TaskRow[]; completions: TaskCompletionRow[]; child: ChildRow; family: FamilyRow; offline: boolean }
  | { kind: 'celebration'; underlying: KidState; lastEvent: NonNullable<KidStateInput['lastEvent']> }
  | { kind: 'takeover';    child: ChildRow; tasks: TaskRow[]; completions: TaskCompletionRow[]; offline: boolean }
  | { kind: 'evolution';   from: number; to: number; child: ChildRow }
  | { kind: 'simplified';  tasks: TaskRow[]; completions: TaskCompletionRow[]; child: ChildRow; family: FamilyRow; offline: boolean };

const STAGE_THRESHOLDS = new Set([7, 14, 21, 30]);

function allComplete(input: KidStateInput): boolean {
  if (input.tasks.length === 0) return false;
  const doneIds = new Set(input.completions.map((c) => c.task_id));
  return input.tasks.every((t) => doneIds.has(t.id));
}

/** Pure mapping from data snapshot to render state. No IO, no side effects. */
export function deriveKidState(input: KidStateInput): KidState {
  // Precedence 1: evolution (one-shot takeover)
  if (input.pendingEvolution) {
    return {
      kind: 'evolution',
      from: input.pendingEvolution.fromStage,
      to: input.pendingEvolution.toStage,
      child: input.child,
    };
  }

  const offline = input.network === 'offline';

  // Compute the underlying (non-celebration, non-greeting) kind first.
  let underlying: KidState;
  if (input.simplifiedToday) {
    underlying = {
      kind: 'simplified',
      tasks: input.tasks,
      completions: input.completions,
      child: input.child,
      family: input.family,
      offline,
    };
  } else if (allComplete(input) && STAGE_THRESHOLDS.has(input.child.successful_days + 1)) {
    // Stage-up threshold crossed → full-screen takeover. Otherwise the resting
    // "all done" state is just TodayScene with a different header, so we route
    // it through the `today` kind below.
    underlying = {
      kind: 'takeover',
      child: input.child,
      tasks: input.tasks,
      completions: input.completions,
      offline,
    };
  } else {
    underlying = {
      kind: 'today',
      tasks: input.tasks,
      completions: input.completions,
      child: input.child,
      family: input.family,
      offline,
    };
  }

  // Precedence 2: celebration (preempts everything except evolution)
  if (input.lastEvent) {
    return { kind: 'celebration', underlying, lastEvent: input.lastEvent };
  }

  // Precedence 3: greeting (one-shot; cleared by hook after shown)
  if (input.greetingSlot) {
    return { kind: 'greeting', child: input.child };
  }

  return underlying;
}
