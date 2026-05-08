import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { todayLocalDate } from '../../src/lib/time';
import { isTaskScheduledOn } from '../../src/domain/tasks';
import { tapLight, tapSuccess } from '../../src/lib/haptics';
import { getParentFirstName } from '../../src/lib/userName';
import type { ChildRow, FamilyRow, TaskCompletionRow, TaskRow as TaskRowType, TimeSlot } from '../../src/types/db';
import {
  Body,
  BodyEmphasis,
  Caption,
  Display,
  IconTile,
  Icons,
  InsightCard,
  PrimaryButton,
  Screen,
  SlotLabel,
  TaskRow,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';

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
    const sb = getParentClient();
    const [{ data: fam }, { data: ch }, { data: ts }] = await Promise.all([
      sb.from('families').select('*').single(),
      sb.from('children').select('*').single(),
      sb.from('tasks').select('*').eq('is_active', true),
    ]);
    setFamily((fam as FamilyRow | null) ?? null);
    setChild((ch as ChildRow | null) ?? null);
    setTasks(((ts ?? []) as TaskRowType[]));

    if (fam) {
      const today = todayLocalDate((fam as FamilyRow).timezone);
      const { data: comps } = await sb
        .from('task_completions')
        .select('task_id')
        .eq('local_date', today);
      setCompletedIds(new Set(((comps ?? []) as Pick<TaskCompletionRow, 'task_id'>[]).map((c) => c.task_id)));
    }

    const { data: ins } = await sb
      .from('ai_insights')
      .select('id, insight_text, is_applied, is_dismissed')
      .eq('is_applied', false)
      .eq('is_dismissed', false)
      .order('generated_at', { ascending: false })
      .limit(1);
    setInsight(((ins ?? [])[0] as AiInsightRow | undefined) ?? null);
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
    const local_date = todayLocalDate(family.timezone);
    tapLight();
    setCompletedIds((prev) => new Set(prev).add(task.id));
    const { error } = await getParentClient().from('task_completions').insert({
      task_id: task.id,
      child_id: child.id,
      local_date,
    });
    if (error) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      Alert.alert('Could not save', error.message);
    } else {
      tapSuccess();
    }
  }

  async function applyInsight() {
    if (!insight) return;
    tapLight();
    await getParentClient().from('ai_insights').update({ is_applied: true }).eq('id', insight.id);
    setInsight(null);
  }
  async function dismissInsight() {
    if (!insight) return;
    await getParentClient().from('ai_insights').update({ is_dismissed: true }).eq('id', insight.id);
    setInsight(null);
  }

  if (!family || !child) {
    return <View style={{ flex: 1, backgroundColor: colors.white }} />;
  }

  const greeting = parentName ?? 'there';

  return (
    <Screen bottomGutter={88}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <IconTile tint="lavender" emoji={greeting.charAt(0).toUpperCase()} />
          <View>
            <Caption>Hello!</Caption>
            <BodyEmphasis>{greeting}</BodyEmphasis>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={10}>
          <IconTile tint="purpleWash" size={40}><Icons.BellIcon size={20} color={colors.purple} /></IconTile>
        </Pressable>
      </View>

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
