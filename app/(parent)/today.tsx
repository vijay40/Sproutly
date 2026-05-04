import { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { todayLocalDate } from '../../src/lib/time';
import { isTaskScheduledOn } from '../../src/domain/tasks';
import type { TaskRow, FamilyRow } from '../../src/types/db';

export default function Today() {
  const [rows, setRows] = useState<{ task: TaskRow; completed: boolean }[]>([]);
  const [tz, setTz] = useState<string>('UTC');

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const supabase = getParentClient();
        const { data: family, error } = await supabase.from('families').select('*').single();
        if (error || !family) {
          setRows([]);
          setTz('UTC');
          return;
        }
        const fam = family as FamilyRow;
        setTz(fam.timezone);

        const { data: tasks } = await supabase.from('tasks').select('*').eq('is_active', true);
        const now = new Date();
        const today = todayLocalDate(fam.timezone, now);
        const todayTasks = (tasks ?? []).filter(
          (t) => !t.is_bonus && isTaskScheduledOn(t as TaskRow, now, fam.timezone)
        ) as TaskRow[];

        const { data: completions } = await supabase
          .from('task_completions')
          .select('task_id')
          .eq('local_date', today);
        const doneIds = new Set((completions ?? []).map((c) => c.task_id));

        setRows(todayTasks.map((t) => ({ task: t, completed: doneIds.has(t.id) })));
      })();
    }, [])
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: '#666', marginBottom: 8 }}>Timezone: {tz}</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.task.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontSize: 16 }}>
              {item.completed ? '✓ ' : '• '}
              {item.task.icon ?? ''} {item.task.title}
            </Text>
            <Text style={{ color: '#666', fontSize: 12 }}>{item.task.time_slot}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No tasks scheduled today.</Text>}
      />
    </View>
  );
}
