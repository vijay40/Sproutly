import { useCallback, useState } from 'react';
import { View, Text, FlatList, Button, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import type { TaskRow } from '../../src/types/db';

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const { data } = await getParentClient()
          .from('tasks')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        setTasks((data ?? []) as TaskRow[]);
      })();
    }, [])
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="+ Add task" onPress={() => router.push('/(parent)/task-edit')} />
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(parent)/task-edit', params: { id: item.id } })
            }
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}
          >
            <Text style={{ fontSize: 16 }}>
              {item.icon ?? '•'} {item.title}
            </Text>
            <Text style={{ color: '#666', fontSize: 12 }}>
              {item.category} · {item.time_slot} · diff {item.difficulty} · {item.recurrence}
              {item.is_bonus ? ' · BONUS' : ''}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ padding: 16 }}>No tasks yet.</Text>}
      />
    </View>
  );
}
