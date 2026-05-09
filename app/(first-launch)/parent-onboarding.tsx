import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text as RNText, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { setMode } from '../../src/lib/mode';
import { tapLight } from '../../src/lib/haptics';
import { friendlyLabel, gmtOffset, guessDeviceZone } from '../../src/lib/timezones';
import {
  Body,
  Caption,
  Display,
  DropdownField,
  EmojiPickerSheet,
  Icons,
  InputField,
  Label,
  PickerSheet,
  PrimaryButton,
  Screen,
  TimezonePickerSheet,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';

const AGE_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 3).map((n) => ({
  value: n,
  label: `${n} years old`,
}));

export default function ParentOnboarding() {
  const router = useRouter();
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState<string>('🦄');
  const detectedZone = useMemo(() => guessDeviceZone(), []);
  const [timezone, setTimezone] = useState<string>(detectedZone);
  const [saving, setSaving] = useState(false);
  const [agePickerOpen, setAgePickerOpen] = useState(false);
  const [tzPickerOpen, setTzPickerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: fam } = await getParentClient().from('families').select('id').limit(1);
      if (fam?.length) {
        await setMode('parent');
        // router.replace('/(parent)/today');
      }
    })();
  }, [router]);

  async function save() {
    if (!childName.trim() || age === null || saving) {
      if (!childName.trim()) Alert.alert('Child name required');
      else if (age === null) Alert.alert('Age required');
      return;
    }
    setSaving(true);
    const sb = getParentClient();
    const { data: session } = await sb.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) { Alert.alert('Not signed in'); setSaving(false); return; }

    const { data: family, error: fErr } = await sb
      .from('families')
      .insert({ parent_user_id: userId, timezone })
      .select()
      .single();
    if (fErr || !family) { Alert.alert('Setup failed', fErr?.message ?? 'Unknown error'); setSaving(false); return; }

    const { error: cErr } = await sb
      .from('children')
      .insert({ family_id: family.id, name: childName.trim(), age, avatar_emoji: avatarEmoji });
    if (cErr) {
      await sb.from('families').delete().eq('id', family.id);
      Alert.alert('Setup failed', cErr.message);
      setSaving(false);
      return;
    }

    await setMode('parent');
    tapLight();
    setSaving(false);
    router.replace('/(parent)/today');
  }

  const tzDisplay = timezone
    ? `${friendlyLabel(timezone)}${gmtOffset(timezone) ? ` · ${gmtOffset(timezone)}` : ''}`
    : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.white }}>
      <Screen>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          style={{ width: 36, height: 36, marginBottom: spacing.md }}
        >
          <Icons.ArrowLeftIcon color={colors.ink} />
        </Pressable>

        <Display>Set up your family</Display>
        <Body color="muted" style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
          We'll start with one child. You can add more later.
        </Body>

        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
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
            <RNText style={{ fontSize: 44, lineHeight: 54 }}>{avatarEmoji}</RNText>
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
          <Caption style={{ marginTop: spacing.xs }}>Tap to change avatar</Caption>
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <InputField label="CHILD NAME" value={childName} onChangeText={setChildName} placeholder="First name" />
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

        <View style={{ flex: 1 }} />

        <PrimaryButton
          title={saving ? 'Saving…' : 'Continue'}
          size="lg"
          fullWidth
          disabled={saving}
          onPress={() => void save()}
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
