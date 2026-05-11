import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text as RNText, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
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
      try {
        const me = await api.me.get();
        if (me.family_id) {
          await setMode('parent');
        }
      } catch {
        /* stay on onboarding */
      }
    })();
  }, [router]);

  async function save(onDone?: () => void) {
    if (!childName.trim() || age === null || saving) {
      if (!childName.trim()) Alert.alert('Child name required');
      else if (age === null) Alert.alert('Age required');
      return;
    }
    setSaving(true);

    try {
      const me = await api.me.get();
      if (!me.family_id) {
        await api.families.create({ timezone });
      }
      await api.children.create({
        name: childName.trim(),
        age,
        avatar_emoji: avatarEmoji,
      });
    } catch (e) {
      Alert.alert('Setup failed', e instanceof Error ? e.message : 'Unknown error');
      setSaving(false);
      return;
    }

    await setMode('parent');
    tapLight();
    setSaving(false);
    if (onDone) {
      onDone();
    } else {
      router.replace('/(parent)/today');
    }
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

        <Label style={{ marginTop: spacing.lg, marginBottom: spacing.s }}>
          KID-VIEW LOCK (OPTIONAL)
        </Label>
        <Pressable
          onPress={() => {
            tapLight();
            void save(() => router.replace('/(first-launch)/create-pin'));
          }}
          accessibilityRole="button"
          accessibilityLabel="Set a 4-digit PIN"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.white,
            borderRadius: 15,
            padding: 14,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 32,
            shadowOffset: { width: 0, height: 4 },
            elevation: 1,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: colors.purpleWash,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RNText style={{ fontSize: 20 }}>🔒</RNText>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Body>Set a 4-digit PIN</Body>
            <Caption>Required to exit kid view. You can skip.</Caption>
          </View>
          <RNText style={{ fontSize: 22, color: colors.muted }}>›</RNText>
        </Pressable>

        <Pressable
          onPress={() => {
            tapLight();
            void save();
          }}
          accessibilityRole="button"
          style={{ alignSelf: 'center', paddingVertical: spacing.s, marginTop: spacing.s }}
        >
          <Body color="muted" style={{ fontWeight: '600' }}>Skip for now</Body>
        </Pressable>

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
