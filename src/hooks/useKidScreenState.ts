import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getKidClient } from '../lib/supabase';
import { getKidChildId } from '../lib/secureStore';
import { loadKidCache, saveKidCache } from '../lib/kidCache';
import { deriveGreetingSlot } from '../lib/greetingSlot';
import { deriveKidState, type KidState, type KidStateInput } from '../domain/kidScreenState';
import { isTaskScheduledOn } from '../domain/tasks';
import { todayLocalDate } from '../lib/time';
import type { ChildRow, FamilyRow, TaskRow, TaskCompletionRow } from '../types/db';

const BG_GAP_MS = 6 * 60 * 60 * 1000; // 6 hours
const CELEBRATION_MS = 2000;
const APPSTATE_KEY = 'kid.lastBackgroundAt';

function evolutionPlayedKey(childId: string, stage: number): string {
  return `kid.evolution.${childId}.${stage}`;
}

export function useKidScreenState(): { state: KidState | null; ready: boolean; onEvolutionFinished: () => void } {
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
  const channelRef = useRef<RealtimeChannel | null>(null);

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

  // Initial load: cache first, then network.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const childId = await getKidChildId();
      if (!childId) {
        if (!cancelled) setReady(true);
        return;
      }

      // 1. Cache read (synchronous-ish)
      const tz = 'UTC'; // unknown before family loads; refined after network fetch
      const cached = await loadKidCache(AsyncStorage, { childId, localDate: todayLocalDate(tz) });
      if (!cancelled && cached) {
        setSnapshot((s) => ({
          ...s,
          child: cached.child,
          family: cached.family,
          tasks: cached.tasks,
          completions: cached.completions,
        }));
      }

      // 2. Network fetch
      try {
        const sb = await getKidClient();
        const [{ data: c }, { data: f }, { data: t }, { data: cmp }] = await Promise.all([
          sb.from('children').select('*').eq('id', childId).maybeSingle(),
          sb.from('families').select('*').maybeSingle(),
          sb.from('tasks').select('*').eq('child_id', childId).eq('is_active', true).eq('is_bonus', false),
          sb.from('task_completions').select('*').eq('child_id', childId),
        ]);
        if (cancelled) return;

        const child = (c ?? null) as ChildRow | null;
        const family = (f ?? null) as FamilyRow | null;
        if (!child || !family) return;

        const today = todayLocalDate(family.timezone);
        const now = new Date();
        const todayTasks = ((t ?? []) as TaskRow[]).filter((x) => isTaskScheduledOn(x, now, family.timezone));
        const todayCompletions = ((cmp ?? []) as TaskCompletionRow[]).filter((x) => x.local_date === today);

        // Evolution one-shot
        let pendingEvolution: KidStateInput['pendingEvolution'] = null;
        if (child.pending_stage_transition) {
          const played = await AsyncStorage.getItem(evolutionPlayedKey(child.id, child.avatar_stage));
          if (played !== '1') {
            pendingEvolution = { fromStage: Math.max(child.avatar_stage - 1, 0), toStage: child.avatar_stage };
          }
        }

        setSnapshot((s) => ({
          ...s,
          child, family,
          tasks: todayTasks,
          completions: todayCompletions,
          pendingEvolution,
        }));

        // Write-through cache
        const lastCompletedAt = todayCompletions.reduce<string | null>(
          (acc, c) => (acc && acc > c.completed_at ? acc : c.completed_at),
          null,
        );
        await saveKidCache(AsyncStorage, {
          childId: child.id,
          localDate: today,
          payload: { tasks: todayTasks, completions: todayCompletions, child, family, lastCompletedAt },
        });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Realtime subscription to task_completions
  useEffect(() => {
    const child = snapshot.child;
    if (!child) return;

    let cancelled = false;
    (async () => {
      const sb = await getKidClient();
      if (cancelled) return;
      const ch = sb
        .channel(`kid-completions-${child.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'task_completions', filter: `child_id=eq.${child.id}` },
          (payload) => {
            const row = payload.new as TaskCompletionRow;
            setSnapshot((s) => {
              const already = s.completions.find((c) => c.id === row.id);
              const completions = already ? s.completions : [...s.completions, row];
              return { ...s, completions, lastEvent: { kind: 'completion', taskId: row.task_id, at: Date.now() } };
            });
            scheduleClearLastEvent();
          },
        )
        .subscribe();
      channelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [snapshot.child, scheduleClearLastEvent]);

  // NetInfo
  useEffect(() => {
    const unsub = NetInfo.addEventListener((info) => {
      setSnapshot((s) => ({ ...s, network: info.isConnected ? 'online' : 'offline' }));
    });
    return () => unsub();
  }, []);

  // AppState wake-up gap → greetingSlot
  useEffect(() => {
    const onChange = async (next: AppStateStatus) => {
      if (next === 'background') {
        await AsyncStorage.setItem(APPSTATE_KEY, String(Date.now()));
        return;
      }
      if (next === 'active') {
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
    const child = snapshot.child;
    if (!child) return;
    await AsyncStorage.setItem(evolutionPlayedKey(child.id, child.avatar_stage), '1');
    setSnapshot((s) => ({ ...s, pendingEvolution: null }));
  }, [snapshot.child]);

  const { child, family, tasks, completions, network, greetingSlot, lastEvent, pendingEvolution } = snapshot;

  const state: KidState | null = child && family
    ? deriveKidState({
        child, family, tasks, completions, network, greetingSlot, lastEvent, pendingEvolution,
        // TODO(ipad-screens): source for simplifiedToday is open question in spec.
        // Default false until miss-simplify persistence is defined.
        simplifiedToday: false,
      })
    : null;

  return { state, ready, onEvolutionFinished };
}
