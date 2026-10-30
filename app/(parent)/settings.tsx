import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { getParentClient } from '../../src/lib/supabase';
import { clearMode } from '../../src/lib/mode';
import { tapLight } from '../../src/lib/haptics';
import type { ChildRow } from '../../src/types/db';
import {
  Body,
  BodyEmphasis,
  Card,
  Caption,
  DangerButton,
  Display,
  IconTile,
  Icons,
  Screen,
  TextButton,
  SectionHeader,
} from '../../src/ui';
import { spacing } from '../../src/theme/tokens';

export default function Settings() {
  const router = useRouter();
  const [child, setChild] = useState<ChildRow | null>(null);
  const [email, setEmail] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');

  const load = useCallback(async () => {
    const sb = getParentClient();
    const [{ data: session }, me, children] = await Promise.all([
      sb.auth.getSession(),
      api.me.get(),
      api.children.list(),
    ]);
    setChild((children[0] as ChildRow | undefined) ?? null);
    setEmail(session.session?.user?.email ?? '');
    setTimezone(me.timezone ?? '');
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function signOut() {
    Alert.alert('Sign out?', 'You will return to the setup screen.', [
      { text: 'Cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await getParentClient().auth.signOut();
          await clearMode();
          router.replace('/(first-launch)');
        },
      },
    ]);
  }

  return (
    <Screen bottomGutter={88}>
      <Display style={{ marginBottom: spacing.lg }}>Settings</Display>

      {child && (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconTile tint="lavender" size={48} emoji={child.avatar_emoji ?? '🦄'} />
          <View style={{ flex: 1 }}>
            <BodyEmphasis>{child.name}</BodyEmphasis>
            <Caption style={{ marginTop: 2 }}>
              {child.age ? `Age ${child.age} · ` : ''}{timezone || ''}
            </Caption>
          </View>
          <TextButton title="Edit" color="purple" onPress={() => router.push('/(parent)/edit-profile')} />
        </Card>
      )}

      <SectionHeader title="Kid view" />
      <Card style={{ marginBottom: spacing.sm }}>
        <BodyEmphasis>Kid-view PIN</BodyEmphasis>
        <Caption style={{ marginTop: 4 }}>Require a PIN to exit kid view on this device.</Caption>
        <Pressable
          onPress={() => {
            tapLight();
            router.push('/(parent)/pin-settings');
          }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md }}
          accessibilityRole="button"
          accessibilityLabel="Kid-view PIN settings"
        >
          <Body color="purple" style={{ fontWeight: '600' }}>
            Manage PIN
          </Body>
          <Icons.ChevronRightIcon />
        </Pressable>
      </Card>

      <SectionHeader title="Account" />
      <Card>
        <Caption>Signed in as</Caption>
        <Body style={{ marginTop: 2 }}>{email || '—'}</Body>
      </Card>

      <DangerButton title="Sign out" fullWidth onPress={signOut} style={{ marginTop: spacing.lg }} />
    </Screen>
  );
}
