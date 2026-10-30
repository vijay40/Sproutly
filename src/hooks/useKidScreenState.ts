import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Alert, Platform, ToastAndroid, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  Child as ApiChild,
  GetMeResponse,
  Task as ApiTask,
  TaskCompletion as ApiTaskCompletion,
} from '@sproutly/api-contract';
import { api } from '../lib/api';
import { getParentClient } from '../lib/supabase';
import { loadKidCache, saveKidCache } from '../lib/kidCache';
import { deriveGreetingSlot } from '../lib/greetingSlot';
import { deriveKidState, STAGE_THRESHOLDS, type KidState, type KidStateInput } from '../domain/kidScreenState';
import { stageFromSuccessfulDays } from '../domain/stageFromSuccessfulDays';
import { isTaskScheduledOn } from '../domain/tasks';
import { todayLocalDate } from '../lib/time';
import type { ChildRow, FamilyRow, TaskRow, TaskCompletionRow } from '../types/db';

const BG_GAP_MS = 6 * 60 * 60 * 1000; // 6 hours
const CELEBRATION_MS = 2000;
/** Celebration duration before same-day evolution video (all-done on threshold day). */
const EVOLUTION_CELEBRATION_MS = 3000;
const APPSTATE_KEY = 'kid.lastBackgroundAt';

function warnKid(e: unknown): void {
  if (__DEV__) console.warn('[useKidScreenState]', e);
}

function toFamilyRow(me: GetMeResponse): FamilyRow | null {
  if (!me.family_id) return null;
  return {
    id: me.family_id,
    parent_user_id: me.user_id,
    timezone: me.timezone ?? 'UTC',
    created_at: '1970-01-01T00:00:00.000Z',
  };
}

function toChildRow(c: ApiChild): ChildRow {
  return {
    id: c.id,
    family_id: c.family_id,
    name: c.name,
    age: c.age,
    avatar_emoji: c.avatar_emoji,
    successful_days: c.successful_days,
    last_evaluated_date: c.last_evaluated_date,
    pending_stage_transition: c.pending_stage_transition,
    created_at: c.created_at,
  };
}

function toTaskRow(t: ApiTask): TaskRow {
  return {
    id: t.id,
    child_id: t.child_id,
    title: t.title,
    icon: t.icon,
    category: t.category,
    time_slot: t.time_slot,
    difficulty: t.difficulty,
    recurrence: t.recurrence,
    recurrence_days: t.recurrence_days,
    is_bonus: t.is_bonus,
    is_active: t.is_active,
    created_at: t.created_at,
  };
}

function toCompletionRow(c: ApiTaskCompletion): TaskCompletionRow {
  return {
    id: c.id,
    task_id: c.task_id,
    child_id: c.child_id,
    local_date: c.local_date,
    completed_at: c.completed_at,
    marked_by_parent: c.marked_by_parent,
  };
}

function evolutionPlayedKey(childId: string, stage: number): string {
  return `kid.evolution.${childId}.${stage}`;
}

function isThresholdEvolutionDay(successfulDays: number): boolean {
  return STAGE_THRESHOLDS.has(successfulDays + 1);
}

/** Stages to play when completing the day before a threshold (e.g. sd 6 → stage 2). */
function evolutionStagesAfterIncrement(preSd: number): { fromStage: number; toStage: number } | null {
  if (!isThresholdEvolutionDay(preSd)) return null;
  const fromStage = stageFromSuccessfulDays(preSd);
  const toStage = stageFromSuccessfulDays(preSd + 1);
  if (toStage <= fromStage) return null;
  return { fromStage, toStage };
}

/** Stages to play when sd already landed on a threshold (e.g. sd 7, video missed). */
function evolutionStagesAtThreshold(successfulDays: number): { fromStage: number; toStage: number } | null {
  if (!STAGE_THRESHOLDS.has(successfulDays)) return null;
  const toStage = stageFromSuccessfulDays(successfulDays);
  const fromStage = stageFromSuccessfulDays(successfulDays - 1);
  if (toStage <= fromStage) return null;
  return { fromStage, toStage };
}

function resolveEvolutionStages(preSd: number, postSd: number): { fromStage: number; toStage: number } | null {
  return evolutionStagesAfterIncrement(preSd) ?? evolutionStagesAtThreshold(postSd);
}

function allScheduledTasksDone(tasks: TaskRow[], completions: TaskCompletionRow[]): boolean {
  const scheduled = tasks.filter((t) => !t.is_bonus);
  if (scheduled.length === 0) return false;
  return scheduled.every((t) => completions.some((c) => c.task_id === t.id));
}

function completionExists(completions: TaskCompletionRow[], row: TaskCompletionRow): boolean {
  return completions.some(
    (c) => c.id === row.id || (c.task_id === row.task_id && c.local_date === row.local_date),
  );
}

export function useKidScreenState(): {
  state: KidState | null;
  ready: boolean;
  onEvolutionFinished: () => void;
  completeTask: (taskId: string) => Promise<void>;
} {
  const [snapshot, setSnapshot] = useState<{
    child: ChildRow | null;
    family: FamilyRow | null;
    tasks: TaskRow[];
    completions: TaskCompletionRow[];
    network: 'online' | 'offline';
    greetingSlot: KidStateInput['greetingSlot'];
    lastEvent: KidStateInput['lastEvent'];
    pendingEvolution: KidStateInput['pendingEvolution'];
  }>({
    child: null, family: null, tasks: [], completions: [],
    network: 'online', greetingSlot: null, lastEvent: null, pendingEvolution: null,
  });
  const [ready, setReady] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evolutionArmedToStage = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const scheduleClearLastEvent = useCallback(() => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    celebrationTimer.current = setTimeout(() => {
      setSnapshot((s) => ({ ...s, lastEvent: null }));
    }, CELEBRATION_MS);
  }, []);

  const scheduleClearGreeting = useCallback(() => {
    if (greetingTimer.current) clearTimeout(greetingTimer.current);
    greetingTimer.current = setTimeout(() => {
      setSnapshot((s) => ({ ...s, greetingSlot: null }));
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      if (greetingTimer.current) clearTimeout(greetingTimer.current);
    };
  }, []);

  /** Schedule evolution after celebration; timer is set synchronously so it cannot be lost to async I/O. */
  const armEvolutionAfterCelebration = useCallback(
    (fromStage: number, toStage: number) => {
      if (evolutionArmedToStage.current === toStage) return;
      evolutionArmedToStage.current = toStage;
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      celebrationTimer.current = setTimeout(() => {
        evolutionArmedToStage.current = null;
        setSnapshot((s) => ({
          ...s,
          lastEvent: null,
          pendingEvolution: { fromStage, toStage },
        }));
      }, EVOLUTION_CELEBRATION_MS);
    },
    [],
  );

  const armEvolutionImmediate = useCallback((fromStage: number, toStage: number) => {
    if (evolutionArmedToStage.current === toStage) return;
    evolutionArmedToStage.current = toStage;
    setSnapshot((s) => ({ ...s, pendingEvolution: { fromStage, toStage } }));
  }, []);

  const reloadChild = useCallback(async (): Promise<ChildRow | null> => {
    try {
      const children = await api.children.list();
      const fresh = children[0];
      if (!fresh) return null;
      const row = toChildRow(fresh);
      setSnapshot((s) => ({ ...s, child: row }));
      return row;
    } catch (e) {
      warnKid(e);
      return null;
    }
  }, []);

  const maybeArmEvolution = useCallback(
    async (
      child: ChildRow,
      preSd: number,
      opts: { afterCelebration: boolean },
    ): Promise<boolean> => {
      const postSd = snapshotRef.current.child?.successful_days ?? preSd;
      const stages = resolveEvolutionStages(preSd, postSd);
      if (!stages) return false;

      const alreadyPlayed = await AsyncStorage.getItem(evolutionPlayedKey(child.id, stages.toStage));
      if (alreadyPlayed === '1') return false;

      if (opts.afterCelebration) {
        armEvolutionAfterCelebration(stages.fromStage, stages.toStage);
      } else {
        armEvolutionImmediate(stages.fromStage, stages.toStage);
      }
      return true;
    },
    [armEvolutionAfterCelebration, armEvolutionImmediate],
  );

  const maybeEvaluateTodayAndArmEvolution = useCallback(
    async (
      completions: TaskCompletionRow[],
      opts: { afterCelebration: boolean },
      ctx?: { child: ChildRow; tasks: TaskRow[] },
    ) => {
      const child = ctx?.child ?? snapshotRef.current.child;
      const tasks = ctx?.tasks ?? snapshotRef.current.tasks;
      const allDone = child ? allScheduledTasksDone(tasks, completions) : false;

      if (!child) {
        if (opts.afterCelebration) scheduleClearLastEvent();
        return;
      }

      if (!allDone) {
        if (opts.afterCelebration) scheduleClearLastEvent();
        return;
      }

      const preSd = child.successful_days;

      try {
        await api.dayRoll.run({ child_id: child.id, evaluate_today: true });
        await reloadChild();
      } catch (e) {
        warnKid(e);
      }

      const armed = await maybeArmEvolution(child, preSd, opts);
      if (!armed && opts.afterCelebration) scheduleClearLastEvent();
    },
    [maybeArmEvolution, reloadChild, scheduleClearLastEvent],
  );

  const finalizePostCompletion = useCallback(
    async (completions: TaskCompletionRow[]) => {
      await maybeEvaluateTodayAndArmEvolution(completions, { afterCelebration: true });
    },
    [maybeEvaluateTodayAndArmEvolution],
  );

  // Initial load: cache first, then network (REST + parent Realtime).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await api.dayRoll.run({}).catch(warnKid);

      let me: GetMeResponse;
      let children: ApiChild[];
      try {
        [me, children] = await Promise.all([api.me.get(), api.children.list()]);
      } catch (e) {
        warnKid(e);
        if (!cancelled) setReady(true);
        return;
      }
      if (cancelled) return;

      const childApi = children[0];
      if (!childApi) {
        if (!cancelled) setReady(true);
        return;
      }

      const family = toFamilyRow(me);
      if (!family) {
        if (!cancelled) setReady(true);
        return;
      }

      const child = toChildRow(childApi);
      const today = todayLocalDate(family.timezone);

      const cached = await loadKidCache(AsyncStorage, { childId: child.id, localDate: today });
      if (!cancelled && cached) {
        setSnapshot((s) => ({
          ...s,
          child: cached.child,
          family: cached.family,
          tasks: cached.tasks,
          completions: cached.completions,
        }));
      }

      try {
        const [taskList, completionList] = await Promise.all([
          api.tasks.list({ child_id: child.id, is_active: 'true' }),
          // Omit local_date — server defaults to family-tz today.
          api.taskCompletions.list({ child_id: child.id }),
        ]);
        if (cancelled) return;

        const tasksRaw = taskList.map(toTaskRow);
        const now = new Date();
        const todayTasks = tasksRaw.filter((x) => isTaskScheduledOn(x, now, family.timezone));
        const todayCompletions = completionList.map(toCompletionRow);

        let pendingEvolution: KidStateInput['pendingEvolution'] = null;
        const thresholdStages = evolutionStagesAtThreshold(child.successful_days);
        if (child.pending_stage_transition && thresholdStages) {
          const played = await AsyncStorage.getItem(evolutionPlayedKey(child.id, thresholdStages.toStage));
          if (played !== '1') pendingEvolution = thresholdStages;
        }

        setSnapshot((s) => ({
          ...s,
          child,
          family,
          tasks: todayTasks,
          completions: todayCompletions,
          pendingEvolution,
        }));

        if (allScheduledTasksDone(todayTasks, todayCompletions)) {
          void maybeEvaluateTodayAndArmEvolution(
            todayCompletions,
            { afterCelebration: false },
            { child, tasks: todayTasks },
          );
        }

        const lastCompletedAt = todayCompletions.reduce<string | null>(
          (acc, c) => (acc && acc > c.completed_at ? acc : c.completed_at),
          null,
        );
        await saveKidCache(AsyncStorage, {
          childId: child.id,
          localDate: today,
          payload: { tasks: todayTasks, completions: todayCompletions, child, family, lastCompletedAt },
        });
      } catch (e) {
        warnKid(e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [maybeEvaluateTodayAndArmEvolution]);

  // Realtime subscription to task_completions (parent session JWT).
  useEffect(() => {
    const child = snapshot.child;
    if (!child) return;

    let cancelled = false;
    const sb = getParentClient();
    const ch = sb
      .channel(`kid-completions-${child.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_completions', filter: `child_id=eq.${child.id}` },
        (payload) => {
          const row = payload.new as TaskCompletionRow;
          const prev = snapshotRef.current;
          if (completionExists(prev.completions, row)) return;

          const completions = [...prev.completions, row];
          setSnapshot((s) => ({
            ...s,
            completions,
            lastEvent: { kind: 'completion', taskId: row.task_id, at: Date.now() },
          }));
          void finalizePostCompletion(completions);
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'task_completions', filter: `child_id=eq.${child.id}` },
        (payload) => {
          // Supabase only sends the primary key on delete; row.id is the
          // completion id. Drop matching rows; do not fire a celebration.
          const row = payload.old as { id?: string };
          if (!row?.id) return;
          setSnapshot((s) => ({
            ...s,
            completions: s.completions.filter((c) => c.id !== row.id),
          }));
        },
      )
      .subscribe();
    channelRef.current = ch;

    return () => {
      cancelled = true;
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [snapshot.child, finalizePostCompletion]);

  // NetInfo
  useEffect(() => {
    const unsub = NetInfo.addEventListener((info) => {
      setSnapshot((s) => ({ ...s, network: info.isConnected ? 'online' : 'offline' }));
    });
    return () => unsub();
  }, []);

  // AppState: day roll on wake + greeting slot after long background.
  useEffect(() => {
    const onChange = async (next: AppStateStatus) => {
      if (next === 'background') {
        await AsyncStorage.setItem(APPSTATE_KEY, String(Date.now()));
        return;
      }
      if (next === 'active') {
        await api.dayRoll.run({}).catch(warnKid);
        const family = snapshot.family;
        if (!family) return;
        const stored = await AsyncStorage.getItem(APPSTATE_KEY);
        const last = stored ? Number(stored) : 0;
        if (last && Date.now() - last > BG_GAP_MS) {
          const slot = deriveGreetingSlot(new Date(), family.timezone);
          if (slot) {
            setSnapshot((s) => ({ ...s, greetingSlot: slot }));
            scheduleClearGreeting();
          }
        }
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [snapshot.family, scheduleClearGreeting]);

  const onEvolutionFinished = useCallback(async () => {
    const child = snapshotRef.current.child;
    const pending = snapshotRef.current.pendingEvolution;
    if (!child) return;

    const toStage = pending?.toStage ?? stageFromSuccessfulDays(child.successful_days);

    try {
      await api.dayRoll.run({
        child_id: child.id,
        clear_pending_stage_transition: true,
      });
      await reloadChild();
      await AsyncStorage.setItem(evolutionPlayedKey(child.id, toStage), '1');
      setSnapshot((s) => ({ ...s, pendingEvolution: null }));
    } catch (e) {
      warnKid(e);
      await AsyncStorage.setItem(evolutionPlayedKey(child.id, toStage), '1');
      setSnapshot((s) => ({ ...s, pendingEvolution: null }));
    }
  }, [reloadChild]);

  const completeTask = useCallback(
    async (taskId: string) => {
      const ch = snapshotRef.current.child;
      const fam = snapshotRef.current.family;
      if (!ch || !fam) return;
      const today = todayLocalDate(fam.timezone);
      const tempId = `optimistic:${taskId}:${Date.now()}`;
      setSnapshot((s) => ({
        ...s,
        completions: [
          ...s.completions,
          {
            id: tempId,
            task_id: taskId,
            child_id: ch.id,
            local_date: today,
            completed_at: new Date().toISOString(),
            marked_by_parent: false,
          },
        ],
        lastEvent: { kind: 'completion', taskId, at: Date.now() },
      }));
      try {
        const res = await api.taskCompletions.create({ task_id: taskId, child_id: ch.id });
        const real = toCompletionRow(res.completion);
        const freshCompletions = [
          ...snapshotRef.current.completions.filter(
            (c) => c.id !== tempId && c.id !== real.id && !(c.task_id === real.task_id && c.local_date === real.local_date),
          ),
          real,
        ];
        setSnapshot((s) => ({ ...s, completions: freshCompletions }));
        await finalizePostCompletion(freshCompletions);
      } catch (e) {
        warnKid(e);
        setSnapshot((s) => ({
          ...s,
          completions: s.completions.filter((c) => c.id !== tempId),
          lastEvent: null,
        }));
        const msg = "Couldn't save — try again when you're online.";
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
        else Alert.alert('Task not saved', msg);
      }
    },
    [finalizePostCompletion],
  );

  const { child, family, tasks, completions, network, greetingSlot, lastEvent, pendingEvolution } = snapshot;

  const state: KidState | null = child && family
    ? deriveKidState({
        child, family, tasks, completions, network, greetingSlot, lastEvent, pendingEvolution,
        simplifiedToday: false,
      })
    : null;

  return { state, ready, onEvolutionFinished, completeTask };
}
