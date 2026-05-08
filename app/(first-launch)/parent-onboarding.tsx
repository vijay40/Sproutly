import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { setMode } from '../../src/lib/mode';
import { tapLight } from '../../src/lib/haptics';
import {
  Body,
  Card,
  Caption,
  Display,
  IconTile,
  Icons,
  InputField,
  Label,
  PillGroup,
  PrimaryButton,
  Screen,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';

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
  const [timezone] = useState(guessTimezone());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={{ width: 36, height: 36, marginBottom: spacing.md }}>
          <Icons.ArrowLeftIcon color={colors.ink} />
        </Pressable>

        <Display>Set up your family</Display>
        <Body color="muted" style={{ marginTop: spacing.xs, marginBottom: spacing.xl }}>
          We'll start with one child. You can add more later.
        </Body>

        <View style={{ marginBottom: spacing.lg }}>
          <InputField label="CHILD NAME" value={childName} onChangeText={setChildName} placeholder="First name" />
        </View>

        <Label style={{ marginBottom: spacing.s }}>AGE</Label>
        <PillGroup options={AGE_OPTIONS} value={age} onChange={(v) => { tapLight(); setAge(v); }} style={{ marginBottom: spacing.lg }} />

        <Label style={{ marginBottom: spacing.s }}>TIMEZONE</Label>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
          <IconTile tint="purpleWash" emoji="🕰️" />
          <View style={{ flex: 1 }}>
            <Body color="ink">{timezone}</Body>
            <Caption style={{ marginTop: 2 }}>auto-detected · tap to change</Caption>
          </View>
        </Card>

        <View style={{ flex: 1 }} />

        <PrimaryButton
          title={saving ? 'Saving…' : 'Continue'}
          size="lg"
          fullWidth
          disabled={saving}
          onPress={() => void save()}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
