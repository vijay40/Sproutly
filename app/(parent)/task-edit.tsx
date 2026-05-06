import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { tapLight } from '../../src/lib/haptics';
import type { Recurrence, TaskRow, TimeSlot } from '../../src/types/db';
import {
  BodyEmphasis,
  Caption,
  DangerButton,
  InputField,
  Label,
  PillGroup,
  PrimaryButton,
  Text,
  TextButton,
  Toggle,
} from '../../src/ui';
import { colors, radii, spacing } from '../../src/theme/tokens';

const SLOT_OPTIONS: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'custom', label: 'Custom' },
  { value: 'one_time', label: 'Once' },
];

const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'S' },
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.wide, paddingTop: spacing.section }}
      >
        {/* Top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
          <TextButton title="Cancel" onPress={() => router.back()} />
          <Label>{editing ? 'EDIT TASK' : 'NEW TASK'}</Label>
          <PrimaryButton title={saving ? 'Saving…' : 'Save'} size="sm" onPress={() => void save()} disabled={saving} />
        </View>

        {/* Icon + title card */}
        <View
          style={{
            backgroundColor: colors.gray50,
            borderRadius: radii.card,
            padding: spacing.xl,
            marginBottom: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <Pressable
            onPress={() => Alert.prompt('Icon', 'Enter an emoji', (v) => setIcon(v ?? ''))}
            style={{
              width: 60,
              height: 60,
              borderRadius: radii.card,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.gray100,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 32 }}>{icon || '•'}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Label style={{ marginBottom: 4 }}>TITLE</Label>
            <InputField
              label=""
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              style={{ fontSize: 17 }}
            />
          </View>
        </View>

        {/* When */}
        <View style={{ marginBottom: spacing.md }}>
          <Label style={{ marginBottom: spacing.s, paddingLeft: spacing.xxs }}>WHEN</Label>
          <PillGroup options={SLOT_OPTIONS} value={slot} onChange={(v) => { tapLight(); setSlot(v); }} />
        </View>

        {/* How often */}
        <View style={{ marginBottom: spacing.md }}>
          <Label style={{ marginBottom: spacing.s, paddingLeft: spacing.xxs }}>HOW OFTEN</Label>
          <PillGroup options={RECURRENCE_OPTIONS} value={recurrence} onChange={(v) => { tapLight(); setRecurrence(v); }} equalWidth={false} />
          {recurrence === 'custom' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.s }}>
              {DAY_OPTIONS.map((d) => {
                const active = days.includes(d.value);
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => {
                      tapLight();
                      setDays((prev) => (prev.includes(d.value) ? prev.filter((x) => x !== d.value) : [...prev, d.value]));
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radii.input,
                      backgroundColor: active ? colors.cobalt : colors.gray50,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BodyEmphasis color={active ? 'white' : 'navyInk'}>{d.label}</BodyEmphasis>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Bonus toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.md,
            backgroundColor: colors.gray50,
            borderRadius: radii.card,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flex: 1, paddingRight: spacing.m }}>
            <BodyEmphasis>Bonus task</BodyEmphasis>
            <Caption style={{ marginTop: 2 }}>Completing unlocks a unicorn cosmetic</Caption>
          </View>
          <Toggle value={isBonus} onChange={(v) => { tapLight(); setIsBonus(v); }} accessibilityLabel="Bonus task" />
        </View>

        {editing && <DangerButton title="Delete task" fullWidth onPress={remove} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
