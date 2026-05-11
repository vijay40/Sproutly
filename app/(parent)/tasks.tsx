import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { tapLight } from '../../src/lib/haptics';
import type { TaskRow as TaskRowType, TimeSlot } from '../../src/types/db';
import {
  Body,
  Display,
  Icons,
  PillGroup,
  Screen,
  SlotLabel,
  TaskRow,
} from '../../src/ui';
import { spacing } from '../../src/theme/tokens';

const SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening'];

type Filter = 'all' | 'routine' | 'bonus';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'routine', label: 'Routine' },
  { value: 'bonus', label: 'Bonus' },
];

function recurrenceLabel(t: TaskRowType): string {
  switch (t.recurrence) {
    case 'daily': return 'Daily';
    case 'weekdays': return 'Weekdays';
    case 'one_time': return 'Once';
    case 'custom': return 'Custom';
  }
}

function timeLabel(t: TaskRowType): string {
  const slot = t.time_slot.charAt(0).toUpperCase() + t.time_slot.slice(1);
  return `${slot} · ${recurrenceLabel(t).toLowerCase()}`;
}

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRowType[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const ts = await api.tasks.list({ is_active: 'true' });
        setTasks(ts as TaskRowType[]);
      })();
    }, []),
  );

  const filtered = tasks.filter((t) =>
    filter === 'all' ? true : filter === 'bonus' ? t.is_bonus : !t.is_bonus,
  );

  return (
    <Screen bottomGutter={88}>
      <Display style={{ marginBottom: spacing.lg }}>Tasks</Display>

      <PillGroup options={FILTERS} value={filter} onChange={setFilter} style={{ marginBottom: spacing.md }} />

      {filtered.length === 0 && (
        <View style={{ paddingTop: spacing.section, alignItems: 'center' }}>
          <Body color="muted">Tap + to add your first task.</Body>
        </View>
      )}

      {SLOTS.map((slot) => {
        const slotTasks = filtered.filter((t) => t.time_slot === slot);
        if (slotTasks.length === 0) return null;
        return (
          <View key={slot}>
            <SlotLabel>{slot.toUpperCase()}</SlotLabel>
            {slotTasks.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  tapLight();
                  router.push({ pathname: '/(parent)/task-edit', params: { id: t.id } });
                }}
                style={{ marginBottom: spacing.sm }}
              >
                <TaskRow
                  icon={t.icon}
                  title={t.title}
                  subtitle={timeLabel(t)}
                  variant={t.is_bonus ? 'bonus' : 'default'}
                  bonusBadge={t.is_bonus}
                  trailing={<Icons.ChevronRightIcon />}
                />
              </Pressable>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}
