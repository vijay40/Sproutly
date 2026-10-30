import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { tapLight } from '../../src/lib/haptics';
import type { Recurrence, TaskRow, TimeSlot } from '../../src/types/db';
import {
  BodyEmphasis,
  Caption,
  Card,
  DangerButton,
  Display,
  EmojiPickerSheet,
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
  const [icon, setIcon] = useState('🌱');
  const [slot, setSlot] = useState<TimeSlot>('morning');
  const [recurrence, setRecurrence] = useState<Recurrence>('daily');
  const [days, setDays] = useState<number[]>([]);
  const [isBonus, setIsBonus] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const children = await api.children.list();
      setChildId(children[0]?.id ?? null);
      if (!editing) return;
      const rows = await api.tasks.list({ is_active: 'all' });
      const row = rows.find((t) => t.id === id);
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
    try {
      if (editing) {
        await api.tasks.update(String(id), payload);
      } else {
        await api.tasks.create({ ...payload, child_id: childId });
      }
    } catch (e) {
      setSaving(false);
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error');
      return;
    }
    setSaving(false);
    tapLight();
    router.back();
  }

  function archive() {
    if (!editing) return;
    Alert.alert('Archive task?', 'It will stop appearing in the daily list.', [
      { text: 'Cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.tasks.softDelete(String(id));
            router.back();
          } catch {
            Alert.alert('Error', 'Could not archive task');
          }
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
            onPress={() => {
              tapLight();
              setEmojiPickerOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Change task icon"
          >
            <IconTile tint="sky" size={44} emoji={icon || '🌱'} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <InputField
              label="TITLE"
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
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

        {editing && <DangerButton title="Archive task" fullWidth onPress={archive} style={{ marginBottom: spacing.md }} />}

        <View style={{ flex: 1 }} />

        <PrimaryButton
          title={saving ? 'Saving…' : 'Save Task'}
          size="lg"
          fullWidth
          disabled={saving}
          onPress={() => void save()}
        />
      </Screen>

      <EmojiPickerSheet
        kind="task"
        visible={emojiPickerOpen}
        value={icon || null}
        onSelect={(v) => setIcon(v)}
        onClose={() => setEmojiPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
