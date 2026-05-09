import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text as RNText, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { tapLight, tapSuccess } from '../../src/lib/haptics';
import { friendlyLabel, gmtOffset, guessDeviceZone } from '../../src/lib/timezones';
import type { ChildRow } from '../../src/types/db';
import {
  Display,
  DropdownField,
  EmojiPickerSheet,
  Icons,
  InputField,
  Label,
  PickerSheet,
  Screen,
  TextButton,
  TimezonePickerSheet,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';

const AGE_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 3).map((n) => ({
  value: n,
  label: `${n} years old`,
}));

interface Original {
  name: string;
  age: number | null;
  avatar_emoji: string | null;
  timezone: string;
}

export default function EditProfile() {
  const router = useRouter();
  const [child, setChild] = useState<ChildRow | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [agePickerOpen, setAgePickerOpen] = useState(false);
  const [tzPickerOpen, setTzPickerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const originalRef = useRef<Original | null>(null);
  const detectedZone = useMemo(() => guessDeviceZone(), []);

  useEffect(() => {
    void (async () => {
      const sb = getParentClient();
      const [{ data: ch }, { data: fam }] = await Promise.all([
        sb.from('children').select('*').single(),
        sb.from('families').select('timezone').single(),
      ]);
      const row = (ch as ChildRow | null) ?? null;
      const tz = ((fam as { timezone: string } | null)?.timezone) ?? '';
      if (row) {
        setChild(row);
        setName(row.name);
        setAge(row.age);
        setAvatarEmoji(row.avatar_emoji);
        setTimezone(tz);
        originalRef.current = {
          name: row.name,
          age: row.age,
          avatar_emoji: row.avatar_emoji,
          timezone: tz,
        };
      }
    })();
  }, []);

  const nameTrimmed = name.trim();
  const isValid = !!nameTrimmed && age !== null && !!timezone;
  const isDirty = (() => {
    const o = originalRef.current;
    if (!o) return false;
    return (
      nameTrimmed !== o.name ||
      age !== o.age ||
      avatarEmoji !== o.avatar_emoji ||
      timezone !== o.timezone
    );
  })();

  async function onSave() {
    if (!child || !isValid || saving) return;
    setSaving(true);
    const sb = getParentClient();
    const [{ error: cErr }, { error: fErr }] = await Promise.all([
      sb
        .from('children')
        .update({ name: nameTrimmed, age, avatar_emoji: avatarEmoji })
        .eq('id', child.id),
      sb.from('families').update({ timezone }).eq('id', child.family_id),
    ]);
    setSaving(false);
    const err = cErr ?? fErr;
    if (err) return Alert.alert('Save failed', err.message);
    tapSuccess();
    router.back();
  }

  const tzDisplay = timezone
    ? `${friendlyLabel(timezone)}${gmtOffset(timezone) ? ` · ${gmtOffset(timezone)}` : ''}`
    : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.white }}
    >
      <Screen>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back"
            style={{ width: 36, height: 36, justifyContent: 'center' }}
          >
            <Icons.ArrowLeftIcon color={colors.ink} />
          </Pressable>
          <TextButton
            title={saving ? 'Saving…' : 'Save'}
            color="purple"
            onPress={onSave}
            disabled={!isDirty || !isValid || saving}
          />
        </View>

        <Display>Edit profile</Display>

        <View style={{ alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl }}>
          <Pressable
            onPress={() => {
              tapLight();
              setEmojiPickerOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Change avatar"
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: colors.purpleWash,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RNText style={{ fontSize: 44, lineHeight: 54 }}>{avatarEmoji ?? '🦄'}</RNText>
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.white,
                borderWidth: 1.5,
                borderColor: colors.purple,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.PencilIcon size={14} color={colors.purple} />
            </View>
          </Pressable>
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <InputField label="CHILD NAME" value={name} onChangeText={setName} placeholder="First name" />
        </View>

        <Label style={{ marginBottom: spacing.s }}>AGE</Label>
        <DropdownField
          value={age !== null ? `${age} years old` : null}
          placeholder="Select age"
          onPress={() => setAgePickerOpen(true)}
          style={{ marginBottom: spacing.lg }}
        />

        <Label style={{ marginBottom: spacing.s }}>TIMEZONE</Label>
        <DropdownField
          value={tzDisplay}
          placeholder="Select timezone"
          onPress={() => setTzPickerOpen(true)}
        />
      </Screen>

      <PickerSheet
        visible={agePickerOpen}
        title="Select age"
        options={AGE_OPTIONS}
        value={age}
        onSelect={(v) => setAge(v)}
        onClose={() => setAgePickerOpen(false)}
      />

      <TimezonePickerSheet
        visible={tzPickerOpen}
        value={timezone || null}
        detectedZone={detectedZone}
        onSelect={(v) => setTimezone(v)}
        onClose={() => setTzPickerOpen(false)}
      />

      <EmojiPickerSheet
        visible={emojiPickerOpen}
        value={avatarEmoji}
        onSelect={(v) => setAvatarEmoji(v)}
        onClose={() => setEmojiPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
