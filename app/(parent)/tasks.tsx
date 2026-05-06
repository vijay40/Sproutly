import { useCallback, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { tapLight } from '../../src/lib/haptics';
import type { ChildRow, TaskRow as TaskRowType, TimeSlot } from '../../src/types/db';
import {
  Caption,
  Display,
  Label,
  SlotLabel,
  TaskRow,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';

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

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRowType[]>([]);
  const [child, setChild] = useState<ChildRow | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const sb = getParentClient();
        const [{ data: ch }, { data: ts }] = await Promise.all([
          sb.from('children').select('*').single(),
          sb.from('tasks').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        ]);
        setChild((ch as ChildRow | null) ?? null);
        setTasks(((ts ?? []) as TaskRowType[]));
      })();
    }, []),
  );

  const activeCount = tasks.length;

  return (
    <ScrollView
      style={{ backgroundColor: colors.white }}
      contentContainerStyle={{ padding: spacing.wide, paddingTop: spacing.section }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: spacing.xxxl,
        }}
      >
        <View style={{ flex: 1 }}>
          {child && <Label>{`${child.name.toUpperCase()}'S ROUTINE`}</Label>}
          <Display style={{ marginTop: 2 }}>Tasks</Display>
          <Caption style={{ marginTop: 2 }}>{activeCount} active</Caption>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add task"
          onPress={() => {
            tapLight();
            router.push('/(parent)/task-edit');
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.cobalt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.white, fontSize: 22, lineHeight: 24, fontFamily: 'Inter-Medium' }}>+</Text>
        </Pressable>
      </View>

      {tasks.length === 0 && child && (
        <View style={{ paddingTop: spacing.section, alignItems: 'center' }}>
          <Caption style={{ textAlign: 'center' }}>Tap + to add {child.name}'s first task.</Caption>
        </View>
      )}

      {SLOTS.map((slot) => {
        const slotTasks = tasks.filter((t) => t.time_slot === slot);
        if (slotTasks.length === 0) return null;
        return (
          <View key={slot} style={{ marginBottom: spacing.xxxl }}>
            <SlotLabel>{slot.toUpperCase()}</SlotLabel>
            {slotTasks.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  tapLight();
                  router.push({ pathname: '/(parent)/task-edit', params: { id: t.id } });
                }}
                style={{ marginBottom: spacing.s }}
              >
                <TaskRow
                  icon={t.icon}
                  title={t.title}
                  subtitle={t.is_bonus ? 'Unlocks cosmetic' : recurrenceLabel(t)}
                  variant={t.is_bonus ? 'bonus' : 'default'}
                  bonusBadge={t.is_bonus}
                  trailing={<Text style={{ color: colors.muted, fontSize: 18 }}>›</Text>}
                />
              </Pressable>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}
