import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/lib/api';
import { todayLocalDate } from '../../src/lib/time';
import { isTaskScheduledOn } from '../../src/domain/tasks';
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

function recurrenceLabel(t: TaskRowType): string {
  switch (t.recurrence) {
    case 'daily': return 'Daily';
    case 'weekdays': return 'Weekdays';
    case 'one_time': return 'Once';
    case 'custom': {
      const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return (t.recurrence_days ?? []).map((d) => short[d]).join(', ');
    }
  }
}

export default function Today() {
  const [family, setFamily] = useState<FamilyRow | null>(null);
  const [child, setChild] = useState<ChildRow | null>(null);
  const [tasks, setTasks] = useState<TaskRowType[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
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
      const today = todayLocalDate(fam.timezone);
      const comps = await api.taskCompletions.list({ child_id: ch.id, local_date: today });
      setCompletedIds(new Set(comps.map((c) => c.task_id)));
    } else {
      setCompletedIds(new Set());
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
  const doneCount = scheduledNonBonus.filter((t) => completedIds.has(t.id)).length;
  const totalCount = scheduledNonBonus.length;

  async function markDone(task: TaskRowType) {
    if (!family || !child) return;
    tapLight();
    setCompletedIds((prev) => new Set(prev).add(task.id));
    try {
      await api.taskCompletions.create({ task_id: task.id, child_id: child.id });
      tapSuccess();
    } catch (e) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
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
        const pending = slotTasks.filter((t) => !completedIds.has(t.id));
        const done = slotTasks.filter((t) => completedIds.has(t.id));
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
                  trailing={
                    <View
                      style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: colors.sage,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Icons.CheckIcon size={16} color={colors.sageInk} />
                    </View>
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
