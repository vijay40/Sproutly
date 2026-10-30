import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/lib/api';
import { isTaskScheduledOn } from '../../src/domain/tasks';
import { recurrenceLabel } from '../../src/lib/recurrence';
import { tapLight, tapSuccess } from '../../src/lib/haptics';
import { getParentFirstName } from '../../src/lib/userName';
import type { ChildRow, FamilyRow, TaskRow as TaskRowType, TimeSlot } from '../../src/types/db';
import {
  Body,
  Caption,
  Display,
  Icons,
  InsightCard,
  PrimaryButton,
  Screen,
  SlotLabel,
  TaskRow,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';
import { TodayTopHeader } from './TodayTopHeader';

type AiInsightRow = {
  id: string;
  insight_text: string;
  is_applied: boolean;
  is_dismissed: boolean;
};

const SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening'];

export default function Today() {
  const [family, setFamily] = useState<FamilyRow | null>(null);
  const [child, setChild] = useState<ChildRow | null>(null);
  const [tasks, setTasks] = useState<TaskRowType[]>([]);
  // task_id → completion id (for the optimistic-undo path).
  const [completionByTask, setCompletionByTask] = useState<Map<string, string>>(new Map());
  const [insight, setInsight] = useState<AiInsightRow | null>(null);
  const [parentName, setParentName] = useState<string | null>(null);

  useEffect(() => {
    void getParentFirstName().then(setParentName);
  }, []);

  const load = useCallback(async () => {
    try {
      await api.dayRoll.run({});
    } catch (e) {
      console.warn('day-roll failed', e);
    }

    const [me, children, taskList, insList] = await Promise.all([
      api.me.get(),
      api.children.list(),
      api.tasks.list({ is_active: 'true' }),
      api.insights.list({ state: 'active' }),
    ]);
    const fam =
      me.family_id && me.timezone
        ? ({
            id: me.family_id,
            timezone: me.timezone,
            parent_user_id: null,
            created_at: '',
          } as FamilyRow)
        : null;
    setFamily(fam);
    const ch = (children[0] as ChildRow | undefined) ?? null;
    setChild(ch);
    setTasks(taskList as TaskRowType[]);

    if (fam && ch) {
      // Don't pass local_date — server defaults to family-tz today, which is
      // authoritative. Hermes lacks full Intl support so `dayjs.tz()` on the
      // client can silently fall back to device-local TZ.
      const comps = await api.taskCompletions.list({ child_id: ch.id });
      const next = new Map<string, string>();
      for (const c of comps) next.set(c.task_id, c.id);
      setCompletionByTask(next);
    } else {
      setCompletionByTask(new Map());
    }

    setInsight((insList[0] as AiInsightRow | undefined) ?? null);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const now = useMemo(() => new Date(), []);

  const todaysTasks = useMemo(() => {
    if (!family) return [];
    return tasks.filter((t) => isTaskScheduledOn(t, now, family.timezone));
  }, [tasks, family, now]);

  const scheduledNonBonus = todaysTasks.filter((t) => !t.is_bonus);
  const doneCount = scheduledNonBonus.filter((t) => completionByTask.has(t.id)).length;
  const totalCount = scheduledNonBonus.length;

  async function markDone(task: TaskRowType) {
    if (!family || !child) return;
    tapLight();
    // Optimistic placeholder id; replaced with the real completion id on response.
    const tempId = `optimistic:${task.id}:${Date.now()}`;
    setCompletionByTask((prev) => new Map(prev).set(task.id, tempId));
    try {
      const res = await api.taskCompletions.create({ task_id: task.id, child_id: child.id });
      setCompletionByTask((prev) => {
        const next = new Map(prev).set(task.id, res.completion.id);
        const scheduled = todaysTasks.filter((t) => !t.is_bonus);
        const allDone = scheduled.length > 0 && scheduled.every((t) => next.has(t.id));
        if (allDone) {
          void api.dayRoll.run({ child_id: child.id, evaluate_today: true }).then(() => load()).catch((e) => {
            console.warn('evaluate_today after all-done failed', e);
          });
        }
        return next;
      });
      tapSuccess();
    } catch (e) {
      setCompletionByTask((prev) => {
        const next = new Map(prev);
        next.delete(task.id);
        return next;
      });
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  async function markUndone(task: TaskRowType) {
    if (!family || !child) return;
    const completionId = completionByTask.get(task.id);
    if (!completionId || completionId.startsWith('optimistic:')) return;
    tapLight();
    setCompletionByTask((prev) => {
      const next = new Map(prev);
      next.delete(task.id);
      return next;
    });
    try {
      await api.taskCompletions.delete(completionId);
    } catch (e) {
      setCompletionByTask((prev) => new Map(prev).set(task.id, completionId));
      Alert.alert('Could not undo', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  async function applyInsight() {
    if (!insight) return;
    tapLight();
    try {
      await api.insights.apply(insight.id);
      setInsight(null);
    } catch {
      Alert.alert('Could not apply insight');
    }
  }
  async function dismissInsight() {
    if (!insight) return;
    try {
      await api.insights.dismiss(insight.id);
      setInsight(null);
    } catch {
      Alert.alert('Could not dismiss insight');
    }
  }

  if (!family || !child) {
    return <View style={{ flex: 1, backgroundColor: colors.white }} />;
  }

  const greeting = parentName ?? 'there';

  return (
    <Screen bottomGutter={88}>
      <TodayTopHeader greeting={greeting} />

      {insight && (
        <InsightCard
          text={insight.insight_text}
          chipLabel="INSIGHT"
          counter={totalCount > 0 ? { current: doneCount, total: totalCount } : undefined}
          onApply={applyInsight}
          onDismiss={dismissInsight}
        />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.s }}>
        <Display>Today</Display>
        {totalCount > 0 && (
          <View
            style={{
              backgroundColor: colors.purpleWash,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text kind="bodyEmphasis" color="purple">{totalCount}</Text>
          </View>
        )}
      </View>

      {scheduledNonBonus.length === 0 && todaysTasks.length === 0 && (
        <View style={{ paddingTop: spacing.section, alignItems: 'center' }}>
          <Body color="muted" style={{ textAlign: 'center' }}>
            Nothing on the list for today. You and {child.name} earned a rest.
          </Body>
        </View>
      )}

      {SLOTS.map((slot) => {
        const slotTasks = todaysTasks.filter((t) => t.time_slot === slot);
        if (slotTasks.length === 0) return null;
        // Bonus is always last within its bucket (last among pending, last
        // among done) — matches the kid-view ordering rule.
        const bonusLast = (a: TaskRowType, b: TaskRowType) =>
          Number(a.is_bonus) - Number(b.is_bonus);
        const pending = slotTasks.filter((t) => !completionByTask.has(t.id)).sort(bonusLast);
        const done = slotTasks.filter((t) => completionByTask.has(t.id)).sort(bonusLast);
        return (
          <View key={slot}>
            <SlotLabel>{slot.toUpperCase()}</SlotLabel>
            {pending.map((t) => (
              <View key={t.id} style={{ marginBottom: spacing.sm }}>
                <TaskRow
                  icon={t.icon}
                  title={t.title}
                  subtitle={`${recurrenceLabel(t)}`}
                  variant={t.is_bonus ? 'bonus' : 'default'}
                  bonusBadge={t.is_bonus}
                  trailing={<PrimaryButton title="Mark" size="sm" onPress={() => void markDone(t)} />}
                />
              </View>
            ))}
            {done.map((t) => (
              <View key={t.id} style={{ marginBottom: spacing.sm }}>
                <TaskRow
                  icon={t.icon}
                  title={t.title}
                  subtitle={recurrenceLabel(t)}
                  variant="completed"
                  bonusBadge={t.is_bonus}
                  trailing={
                    <Pressable
                      onPress={() => void markUndone(t)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${t.title} as not done`}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        borderRadius: 999,
                        backgroundColor: pressed ? colors.sage : 'transparent',
                      })}
                    >
                      <View
                        style={{
                          width: 28, height: 28, borderRadius: 14,
                          backgroundColor: colors.sage,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Icons.CheckIcon size={16} color={colors.sageInk} />
                      </View>
                      <Caption color="purple" style={{ fontWeight: '600' }}>Reopen</Caption>
                    </Pressable>
                  }
                />
              </View>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}
