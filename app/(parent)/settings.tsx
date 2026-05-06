import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { clearMode } from '../../src/lib/mode';
import { relativeTime } from '../../src/lib/relativeTime';
import { tapLight } from '../../src/lib/haptics';
import type { ChildRow } from '../../src/types/db';
import {
  Body,
  BodyEmphasis,
  Caption,
  DangerButton,
  Display,
  Label,
  SecondaryButton,
  Text,
  TextButton,
} from '../../src/ui';
import { colors, radii, spacing } from '../../src/theme/tokens';

type DeviceRow = { id: string; device_label: string | null; paired_at: string | null; device_token_hash: string | null };

export default function Settings() {
  const router = useRouter();
  const [child, setChild] = useState<ChildRow | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [email, setEmail] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');

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
    Alert.alert('Pairing code', `Enter this code on the iPad:\n\n${row?.pairing_code}\n\nExpires at ${new Date(row?.expires_at).toLocaleTimeString()}`);
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
    <ScrollView
      style={{ backgroundColor: colors.white }}
      contentContainerStyle={{ padding: spacing.wide, paddingTop: spacing.section }}
    >
      <View style={{ marginBottom: spacing.xxxl }}>
        <Label>ACCOUNT</Label>
        <Display style={{ marginTop: 2 }}>Settings</Display>
      </View>

      {/* Child */}
      <Label style={{ marginBottom: spacing.s, paddingLeft: spacing.xxs }}>CHILD</Label>
      {child && (
        <View
          style={{
            backgroundColor: colors.gray50,
            borderRadius: radii.card,
            padding: spacing.md,
            marginBottom: spacing.xxxl,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.md }}>
            <View
              style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: colors.sky,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24 }}>🦄</Text>
            </View>
            <View style={{ flex: 1 }}>
              <BodyEmphasis>{child.name}</BodyEmphasis>
              <Caption style={{ marginTop: 1 }}>
                {child.age ? `Age ${child.age} · ` : ''}Stage {child.avatar_stage} · {child.successful_days} successful days
              </Caption>
            </View>
          </View>
          <SecondaryButton title="Edit profile" fullWidth size="sm" onPress={() => Alert.alert('Edit profile', 'Coming soon.')} />
        </View>
      )}

      {/* Kid iPad */}
      <Label style={{ marginBottom: spacing.s, paddingLeft: spacing.xxs }}>KID IPAD</Label>
      {devices.map((d) => (
        <View
          key={d.id}
          style={{
            backgroundColor: colors.gray50,
            borderRadius: radii.card,
            padding: spacing.md,
            marginBottom: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.m,
          }}
        >
          <View
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: colors.sageChip,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.sageInk, fontSize: 16 }}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <BodyEmphasis>{d.device_label ?? 'iPad'}</BodyEmphasis>
            <Caption>
              {d.paired_at ? `Paired ${relativeTime(new Date(d.paired_at))}` : 'Paired'}
            </Caption>
          </View>
          <TextButton title="Remove" color="cobalt" onPress={() => removeDevice(d.id)} />
        </View>
      ))}
      <SecondaryButton
        title={devices.length === 0 ? '+ Pair an iPad' : '+ Pair another iPad'}
        fullWidth
        onPress={generatePairingCode}
        style={{ marginBottom: spacing.xxxl }}
      />

      {/* Preferences */}
      <Label style={{ marginBottom: spacing.s, paddingLeft: spacing.xxs }}>PREFERENCES</Label>
      <Pressable
        onPress={() => Alert.alert('Timezone', 'Timezone picker coming soon.')}
        style={{
          backgroundColor: colors.gray50,
          borderRadius: radii.card,
          padding: spacing.md,
          marginBottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.m,
        }}
      >
        <View style={{ flex: 1 }}>
          <Body>Timezone</Body>
          <Caption style={{ marginTop: 1 }}>{timezone}</Caption>
        </View>
        <Text style={{ color: colors.muted, fontSize: 18 }}>›</Text>
      </Pressable>

      <View
        style={{
          backgroundColor: colors.gray50,
          borderRadius: radii.card,
          padding: spacing.md,
          marginBottom: spacing.xxxl,
        }}
      >
        <Body>{email || '—'}</Body>
        <Caption style={{ marginTop: 1 }}>Signed in with Google</Caption>
      </View>

      <DangerButton title="Sign out" fullWidth onPress={signOut} />
    </ScrollView>
  );
}
