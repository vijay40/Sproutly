import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { setMode } from '../../src/lib/mode';
import { tapLight } from '../../src/lib/haptics';
import {
  Body,
  Caption,
  HeadingLg,
  InputField,
  Label,
  PillGroup,
  PrimaryButton,
  Text,
} from '../../src/ui';
import { colors, radii, spacing } from '../../src/theme/tokens';

function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const AGE_OPTIONS = [5, 6, 7, 8, 9].map((n) => ({ value: n, label: String(n) }));

export default function ParentOnboarding() {
  const router = useRouter();
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [timezone, setTimezone] = useState(guessTimezone());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If the user previously signed in but onboarding was interrupted, check for an existing family.
    void (async () => {
      const { data: fam } = await getParentClient().from('families').select('id').limit(1);
      if (fam?.length) {
        await setMode('parent');
        router.replace('/(parent)/today');
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
      .insert({ family_id: family.id, name: childName.trim(), age });
    if (cErr) {
      // Roll back the just-created family row so the user isn't stuck in a partial state.
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.wide, paddingTop: spacing.section, flexGrow: 1 }}>
        <Pressable onPress={() => router.back()} style={{ width: 30, height: 30, marginBottom: spacing.wide }} accessibilityLabel="Back">
          <Text style={{ color: colors.muted, fontSize: 22, lineHeight: 24 }}>‹</Text>
        </Pressable>

        <View style={{ marginBottom: spacing.wide }}>
          <HeadingLg>Tell us about your child</HeadingLg>
          <Caption style={{ marginTop: 4 }}>This is the only child you'll set up in V1.</Caption>
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <InputField label="CHILD'S NAME" value={childName} onChangeText={setChildName} placeholder="First name" />
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <Label style={{ marginBottom: spacing.s, paddingLeft: spacing.xxs }}>AGE</Label>
          <PillGroup options={AGE_OPTIONS} value={age} onChange={(v) => { tapLight(); setAge(v); }} />
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <Label style={{ marginBottom: spacing.s, paddingLeft: spacing.xxs }}>TIMEZONE</Label>
          <View
            style={{
              backgroundColor: colors.gray50,
              borderRadius: radii.card,
              padding: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.m,
            }}
          >
            <Body style={{ flex: 1 }}>{timezone}</Body>
            <Caption>auto-detected</Caption>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <PrimaryButton title={saving ? 'Saving…' : 'Continue'} size="lg" fullWidth disabled={saving} onPress={() => void save()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
