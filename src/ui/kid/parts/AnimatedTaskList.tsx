import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import type { TaskCompletionRow, TaskRow as TaskRowType } from '../../../types/db';
import { TaskRow } from './TaskRow';

const REORDER_ANIM_MS = 1200;

/**
 * Order tasks for the kid view. Bonus tasks are *always* last within their
 * bucket — last among undone, last among done — regardless of when they were
 * completed.
 *
 *   1. Incomplete non-bonus (in incoming order)
 *   2. Incomplete bonus
 *   3. Completed non-bonus, oldest → newest
 *   4. Completed bonus, oldest → newest
 */
function orderTasks(tasks: TaskRowType[], completions: TaskCompletionRow[]): TaskRowType[] {
  const completedAt = new Map<string, string>();
  for (const c of completions) completedAt.set(c.task_id, c.completed_at);

  const incompleteRoutine: TaskRowType[] = [];
  const incompleteBonus: TaskRowType[] = [];
  const completedRoutine: TaskRowType[] = [];
  const completedBonus: TaskRowType[] = [];
  for (const t of tasks) {
    const isDone = completedAt.has(t.id);
    if (isDone && t.is_bonus) completedBonus.push(t);
    else if (isDone) completedRoutine.push(t);
    else if (t.is_bonus) incompleteBonus.push(t);
    else incompleteRoutine.push(t);
  }
  const byCompletedAt = (a: TaskRowType, b: TaskRowType) =>
    (completedAt.get(a.id) ?? '').localeCompare(completedAt.get(b.id) ?? '');
  completedRoutine.sort(byCompletedAt);
  completedBonus.sort(byCompletedAt);
  return [...incompleteRoutine, ...incompleteBonus, ...completedRoutine, ...completedBonus];
}

/**
 * FLIP-style row reorder. We can't rely on RN's `LayoutAnimation` (it's flaky
 * under React 19 concurrent rendering — calls get coalesced and reorders snap).
 * Instead, each row owns an `Animated.Value` for its translateY:
 *
 *   1. On render, compute new ordered list + index map.
 *   2. For any row whose index changed, prime translateY to
 *      `(oldIndex - newIndex) * rowStride` synchronously during render so the
 *      row paints in its OLD position.
 *   3. After commit, animate translateY back to 0.
 *
 * The user sees rows visibly slide from their previous slots into their new
 * slots over REORDER_ANIM_MS.
 */
function AnimatedRow({
  taskId,
  index,
  rowStride,
  prevIndices,
  children,
}: {
  taskId: string;
  index: number;
  rowStride: number;
  prevIndices: Map<string, number>;
  children: ReactNode;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // Prime synchronously during render. Tracking `primedFor` so we only prime
  // once per index change (StrictMode double-invokes are safe — value is
  // re-set to the same delta).
  const primedFor = useRef<number | null>(null);
  if (primedFor.current !== index) {
    const prev = prevIndices.get(taskId);
    if (prev !== undefined && prev !== index && rowStride > 0) {
      translateY.setValue((prev - index) * rowStride);
    }
    primedFor.current = index;
  }

  useEffect(() => {
    if (animRef.current) animRef.current.stop();
    const anim = Animated.timing(translateY, {
      toValue: 0,
      duration: REORDER_ANIM_MS,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    });
    animRef.current = anim;
    anim.start();
  }, [index, translateY]);

  return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
}

interface Props {
  tasks: TaskRowType[];
  completions: TaskCompletionRow[];
  /** Row height + vertical gap, used to translate rows from their old slot. */
  rowStride: number;
  /** Optional fixed row width (landscape uses fluid width). */
  rowWidth?: number;
  containerStyle?: ViewStyle;
  onIncompleteTaskPress?: (task: TaskRowType) => void;
}

/**
 * Renders the kid's task list with an animated reorder whenever a task's
 * position changes (e.g. on completion → row slides to the bottom).
 *
 * Lives in its own component so the reorder state (per-row translateY refs +
 * the index snapshot) survives parent re-renders. In particular, this list
 * MUST stay continuously mounted across celebration toggles — see
 * `app/(kid)/display.tsx` for the sibling-overlay pattern that guarantees it.
 */
export function AnimatedTaskList({
  tasks,
  completions,
  rowStride,
  rowWidth,
  containerStyle,
  onIncompleteTaskPress,
}: Props) {
  const ordered = useMemo(() => orderTasks(tasks, completions), [tasks, completions]);

  // Snapshot indices BEFORE this render's children run so AnimatedRow sees
  // the previous mapping when computing its prime offset. After we map, we
  // overwrite the ref with the new indices for next time.
  const lastIndices = useRef<Map<string, number>>(new Map());
  const prevIndices = lastIndices.current;
  const nextIndices = new Map<string, number>();
  ordered.forEach((t, i) => nextIndices.set(t.id, i));
  lastIndices.current = nextIndices;

  return (
    <View style={containerStyle}>
      {ordered.map((t, i) => (
        <AnimatedRow key={t.id} taskId={t.id} index={i} rowStride={rowStride} prevIndices={prevIndices}>
          <TaskRow
            task={t}
            completion={completions.find((c) => c.task_id === t.id) ?? null}
            width={rowWidth}
            onIncompletePress={onIncompleteTaskPress}
          />
        </AnimatedRow>
      ))}
    </View>
  );
}
