import { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getKidClient } from '../../src/lib/supabase';
import { getKidChildId } from '../../src/lib/secureStore';
import { isTaskScheduledOn } from '../../src/domain/tasks';
import { todayLocalDate } from '../../src/lib/time';
import type { ChildRow, FamilyRow, TaskRow } from '../../src/types/db';

export default function Display() {
  const [child, setChild] = useState<ChildRow | null>(null);
  const [family, setFamily] = useState<FamilyRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const childId = await getKidChildId();
        if (!childId) return;
        const sb = await getKidClient();
        const [{ data: c }, { data: f }, { data: t }] = await Promise.all([
          sb.from('children').select('*').eq('id', childId).maybeSingle(),
          sb.from('families').select('*').maybeSingle(),
          sb.from('tasks').select('*').eq('child_id', childId).eq('is_active', true),
        ]);
        setChild((c as ChildRow | null) ?? null);
        setFamily((f as FamilyRow | null) ?? null);
        const fam = f as FamilyRow | null;
        const now = new Date();
        setTasks(
          ((t ?? []) as TaskRow[]).filter(
            (x) => !x.is_bonus && fam && isTaskScheduledOn(x, now, fam.timezone),
          ),
        );
      })();
    }, []),
  );

  if (!child || !family) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Waiting for data…</Text>
      </View>
    );
  }

  const today = todayLocalDate(family.timezone);

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 28, textAlign: 'center' }}>Hi, {child.name}!</Text>
      <Text style={{ textAlign: 'center', color: '#666', marginBottom: 16 }}>
        Stage {child.avatar_stage} · {today}
      </Text>
      <FlatList
        data={tasks.slice(0, 3)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 16,
              borderWidth: 2,
              borderColor: '#ddd',
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 48, textAlign: 'center' }}>{item.icon ?? '•'}</Text>
            <Text style={{ fontSize: 24, textAlign: 'center' }}>{item.title}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center' }}>All done for today!</Text>}
      />
    </View>
  );
}
