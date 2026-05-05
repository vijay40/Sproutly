import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import type { Category, TimeSlot, Recurrence, TaskRow } from '../../src/types/db';

const CATEGORIES: Category[] = ['routine', 'chore', 'behavior'];
const SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening'];
const RECURRENCES: Recurrence[] = ['daily', 'weekdays', 'custom', 'one_time'];

function Row({ label, content }: { label: string; content: ReactNode }) {
  return (
    <View style={{ marginVertical: 8 }}>
      <Text style={{ fontWeight: '600' }}>{label}</Text>
      {content}
    </View>
  );
}

function Pill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: active ? '#333' : '#ccc',
        backgroundColor: active ? '#333' : 'transparent',
        borderRadius: 999,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <Text style={{ color: active ? 'white' : '#333' }}>{label}</Text>
    </Pressable>
  );
}

export default function TaskEdit() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const editing = !!id;

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const [category, setCategory] = useState<Category>('routine');
  const [slot, setSlot] = useState<TimeSlot>('morning');
  const [difficulty, setDifficulty] = useState<number>(1);
  const [recurrence, setRecurrence] = useState<Recurrence>('daily');
  const [days, setDays] = useState<number[]>([]);
  const [isBonus, setIsBonus] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = getParentClient();
      const { data: children } = await supabase.from('children').select('id').limit(1);
      setChildId(children?.[0]?.id ?? null);
      if (!editing || !id) return;
      const { data: row } = await supabase.from('tasks').select('*').eq('id', id).single();
      if (!row) return;
      const t = row as TaskRow;
      setTitle(t.title);
      setIcon(t.icon ?? '');
      setCategory(t.category);
      setSlot(t.time_slot);
      setDifficulty(t.difficulty);
      setRecurrence(t.recurrence);
      setDays(t.recurrence_days ?? []);
      setIsBonus(t.is_bonus);
    })();
  }, [id, editing]);

  async function save() {
    if (saving) return;
    if (!title.trim() || !childId) {
      Alert.alert('Missing info', 'Title and child are required.');
      return;
    }
    setSaving(true);
    const supabase = getParentClient();
    const payload: Partial<TaskRow> = {
      title: title.trim(),
      icon: icon.trim() || null,
      category,
      time_slot: slot,
      difficulty,
      recurrence,
      recurrence_days: recurrence === 'custom' ? days : null,
      is_bonus: isBonus,
    };
    if (editing && id) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', id);
      if (error) {
        setSaving(false);
        return Alert.alert('Error', error.message);
      }
    } else {
      const { error } = await supabase.from('tasks').insert({
        ...payload,
        child_id: childId,
        is_active: true,
        bonus_cosmetic_id: null,
      });
      if (error) {
        setSaving(false);
        return Alert.alert('Error', error.message);
      }
    }
    setSaving(false);
    router.back();
  }

  async function remove() {
    if (!editing || !id) return;
    Alert.alert('Delete task?', 'This will deactivate it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await getParentClient().from('tasks').update({ is_active: false }).eq('id', id);
            router.back();
          })();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Row
        label="Title"
        content={
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6 }}
          />
        }
      />
      <Row
        label="Icon (emoji)"
        content={
          <TextInput
            value={icon}
            onChangeText={setIcon}
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6 }}
          />
        }
      />
      <Row
        label="Category"
        content={
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => (
              <Pill key={c} active={category === c} label={c} onPress={() => setCategory(c)} />
            ))}
          </View>
        }
      />
      <Row
        label="Time slot"
        content={
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {SLOTS.map((s) => (
              <Pill key={s} active={slot === s} label={s} onPress={() => setSlot(s)} />
            ))}
          </View>
        }
      />
      <Row
        label="Difficulty"
        content={
          <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3].map((d) => (
              <Pill
                key={d}
                active={difficulty === d}
                label={String(d)}
                onPress={() => setDifficulty(d)}
              />
            ))}
          </View>
        }
      />
      <Row
        label="Recurrence"
        content={
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {RECURRENCES.map((r) => (
              <Pill key={r} active={recurrence === r} label={r} onPress={() => setRecurrence(r)} />
            ))}
          </View>
        }
      />
      {recurrence === 'custom' && (
        <Row
          label="Days (0=Sun..6=Sat)"
          content={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <Pill
                  key={d}
                  active={days.includes(d)}
                  label={['S', 'M', 'T', 'W', 'T', 'F', 'S'][d]}
                  onPress={() =>
                    setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])
                  }
                />
              ))}
            </View>
          }
        />
      )}
      <Row
        label="Bonus task"
        content={
          <Pill active={isBonus} label={isBonus ? 'Yes' : 'No'} onPress={() => setIsBonus(!isBonus)} />
        }
      />
      <View style={{ height: 16 }} />
      <Button
        title={saving ? 'Saving…' : editing ? 'Save' : 'Create'}
        onPress={() => void save()}
        disabled={saving || !title.trim() || !childId}
      />
      {editing && (
        <>
          <View style={{ height: 8 }} />
          <Button title="Delete" onPress={() => void remove()} color="red" />
        </>
      )}
    </ScrollView>
  );
}
