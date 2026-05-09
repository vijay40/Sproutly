import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { clearMode } from '../../src/lib/mode';
import { relativeTime } from '../../src/lib/relativeTime';
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
  PairCodeSheet,
  Screen,
  SecondaryButton,
  TextButton,
  SectionHeader,
} from '../../src/ui';
import { spacing } from '../../src/theme/tokens';

type DeviceRow = { id: string; device_label: string | null; paired_at: string | null; device_token_hash: string | null };

export default function Settings() {
  const router = useRouter();
  const [child, setChild] = useState<ChildRow | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [email, setEmail] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');
  const [pairing, setPairing] = useState<{ code: string; expiresAt: Date } | null>(null);

  const load = useCallback(async () => {
    const sb = getParentClient();
    const [{ data: ch }, { data: devs }, { data: fam }, { data: session }] = await Promise.all([
      sb.from('children').select('*').single(),
      sb.from('kid_devices').select('id, device_label, paired_at, device_token_hash').not('device_token_hash', 'is', null),
      sb.from('families').select('timezone').single(),
      sb.auth.getSession(),
    ]);
    setChild((ch as ChildRow | null) ?? null);
    setDevices(((devs ?? []) as DeviceRow[]));
    setEmail(session.session?.user?.email ?? '');
    setTimezone(((fam as { timezone: string } | null)?.timezone) ?? '');
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function generatePairingCode() {
    tapLight();
    const { data, error } = await getParentClient().rpc('create_pairing_code');
    if (error) return Alert.alert('Error', error.message);
    const row = Array.isArray(data) ? data[0] : data;
    const code = row?.pairing_code as string | undefined;
    const expiresAtRaw = row?.expires_at as string | undefined;
    if (!code || !expiresAtRaw) return Alert.alert('Error', 'Could not generate pairing code.');
    setPairing({ code, expiresAt: new Date(expiresAtRaw) });
    void load();
  }

  async function removeDevice(id: string) {
    Alert.alert('Remove iPad?', 'This will sign out that iPad.', [
      { text: 'Cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await getParentClient().from('kid_devices').delete().eq('id', id);
          void load();
        },
      },
    ]);
  }

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

      <SectionHeader title="Paired iPads" />
      {devices.map((d) => (
        <Card key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
          <IconTile tint="sky" size={40} emoji="📱" />
          <View style={{ flex: 1 }}>
            <BodyEmphasis>{d.device_label ?? 'Kid iPad'}</BodyEmphasis>
            <Caption>{d.paired_at ? `Paired ${relativeTime(new Date(d.paired_at))}` : 'Paired'}</Caption>
          </View>
          <Pressable onPress={() => removeDevice(d.id)} accessibilityLabel="Remove iPad">
            <Icons.ChevronRightIcon />
          </Pressable>
        </Card>
      ))}
      <SecondaryButton
        title={devices.length === 0 ? '+ Pair an iPad' : '+ Pair another iPad'}
        fullWidth
        onPress={generatePairingCode}
        style={{ marginTop: devices.length === 0 ? 0 : spacing.xs }}
      />

      <SectionHeader title="Account" />
      <Card>
        <Caption>Signed in as</Caption>
        <Body style={{ marginTop: 2 }}>{email || '—'}</Body>
      </Card>

      <DangerButton title="Sign out" fullWidth onPress={signOut} style={{ marginTop: spacing.lg }} />

      <PairCodeSheet
        visible={pairing !== null}
        code={pairing?.code ?? null}
        expiresAt={pairing?.expiresAt ?? null}
        onClose={() => setPairing(null)}
      />
    </Screen>
  );
}
