import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { tapLight } from '../../src/lib/haptics';
import type { Recurrence, TaskRow, TimeSlot } from '../../src/types/db';
import {
  BodyEmphasis,
  Caption,
  Card,
  DangerButton,
  Display,
  IconTile,
  Icons,
  InputField,
  Label,
  PillGroup,
  PrimaryButton,
  Screen,
  Toggle,
} from '../../src/ui';
import { colors, radii, spacing } from '../../src/theme/tokens';

const SLOT_OPTIONS: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
];

export default function TaskEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const [slot, setSlot] = useState<TimeSlot>('morning');
  const [recurrence, setRecurrence] = useState<Recurrence>('daily');
  const [days, setDays] = useState<number[]>([]);
  const [isBonus, setIsBonus] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const sb = getParentClient();
      const { data: children } = await sb.from('children').select('id').limit(1);
      setChildId(children?.[0]?.id ?? null);
      if (!editing) return;
      const { data: row } = await sb.from('tasks').select('*').eq('id', id).single();
      if (!row) return;
      const r = row as TaskRow;
      setTitle(r.title);
      setIcon(r.icon ?? '');
      setSlot(r.time_slot);
      setRecurrence(r.recurrence);
      setDays(r.recurrence_days ?? []);
      setIsBonus(r.is_bonus);
    })();
  }, [id, editing]);

  function toggleDay(v: number) {
    tapLight();
    setRecurrence('custom');
    setDays((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function save() {
    if (!title.trim() || !childId || saving) {
      if (!title.trim()) Alert.alert('Title required');
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      icon: icon.trim() || null,
      category: 'routine' as const,
      time_slot: slot,
      difficulty: 1,
      recurrence,
      recurrence_days: recurrence === 'custom' ? days : null,
      is_bonus: isBonus,
    };
    const sb = getParentClient();
    const { error } = editing
      ? await sb.from('tasks').update(payload).eq('id', id)
      : await sb.from('tasks').insert({ ...payload, child_id: childId });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    tapLight();
    router.back();
  }

  function remove() {
    if (!editing) return;
    Alert.alert('Delete task?', 'This will deactivate it.', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await getParentClient().from('tasks').update({ is_active: false }).eq('id', id);
          router.back();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.white }}>
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={{ width: 36, height: 36 }}>
            <Icons.ArrowLeftIcon color={colors.ink} />
          </Pressable>
          <Display style={{ fontSize: 20 }}>{editing ? 'Edit Task' : 'New Task'}</Display>
          <View style={{ width: 36 }} />
        </View>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <Pressable
            onPress={() =>
              Alert.prompt?.('Icon', 'Enter an emoji', (v: string | undefined) => setIcon(v ?? ''))
            }
          >
            <IconTile tint="sky" size={44} emoji={icon || '•'} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Caption>Title</Caption>
            <BodyEmphasis>{title || 'Untitled task'}</BodyEmphasis>
            <InputField
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              style={{ marginTop: spacing.s }}
            />
          </View>
        </Card>

        <Label style={{ marginBottom: spacing.s, marginTop: spacing.lg }}>TIME SLOT</Label>
        <PillGroup
          options={SLOT_OPTIONS}
          value={slot}
          onChange={(v) => { tapLight(); setSlot(v); }}
          style={{ marginBottom: spacing.md }}
        />

        <Label style={{ marginBottom: spacing.s, marginTop: spacing.lg }}>REPEAT</Label>
        <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
          {DAY_OPTIONS.map((d) => {
            const active = days.includes(d.value);
            return (
              <Pressable
                key={d.value}
                onPress={() => toggleDay(d.value)}
                accessibilityRole="button"
                accessibilityLabel={`Day ${d.label}`}
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: radii.input,
                  backgroundColor: active ? colors.purple : colors.purpleWash,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BodyEmphasis color={active ? 'white' : 'purple'}>{d.label}</BodyEmphasis>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <BodyEmphasis>Bonus task</BodyEmphasis>
            <Caption style={{ marginTop: 2 }}>Extra task, no guilt when skipped</Caption>
          </View>
          <Toggle value={isBonus} onChange={(v) => { tapLight(); setIsBonus(v); }} accessibilityLabel="Bonus task" />
        </Card>

        {editing && <DangerButton title="Delete task" fullWidth onPress={remove} style={{ marginBottom: spacing.md }} />}

        <View style={{ flex: 1 }} />

        <PrimaryButton
          title={saving ? 'Saving…' : 'Save Task'}
          size="lg"
          fullWidth
          disabled={saving}
          onPress={() => void save()}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
