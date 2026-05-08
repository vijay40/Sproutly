import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { saveKidAuth } from '../../src/lib/secureStore';
import { setMode } from '../../src/lib/mode';
import { resetClients } from '../../src/lib/supabase';
import { getPairingRedeemUrl } from '../../src/lib/server';
import { tapLight, tapSuccess } from '../../src/lib/haptics';
import {
  Body,
  Caption,
  CodeEntry,
  Display,
  IconTile,
  Icons,
  Screen,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';

export default function KidPair() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function redeem() {
    if (!/^\d{6}$/.test(code)) return;
    setLoading(true);
    let url: string;
    try {
      url = getPairingRedeemUrl();
    } catch {
      setLoading(false);
      Alert.alert(
        'Pairing not configured',
        'This iPad is missing the server URL. Ask the person who set up the app to add EXPO_PUBLIC_SERVER_URL to .env.local.',
      );
      return;
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pairing_code: code }),
      });
      if (!res.ok) {
        const text = await res.text();
        Alert.alert('Pairing failed', `${res.status} ${text}`);
        return;
      }
      const { token, child_id } = (await res.json()) as { token: string; child_id: string };
      await saveKidAuth(token, child_id);
      await setMode('kid');
      resetClients();
      tapSuccess();
      router.replace('/(kid)/display');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false}>
      <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={{ width: 36, height: 36, marginBottom: spacing.lg }}>
        <Icons.ArrowLeftIcon color={colors.ink} />
      </Pressable>

      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <IconTile tint="sky" size={80} style={{ borderRadius: 40, marginBottom: spacing.md }} emoji="📱" />
        <Display style={{ textAlign: 'center' }}>Pair this iPad</Display>
        <Body color="muted" style={{ textAlign: 'center', marginTop: spacing.s, maxWidth: 300 }}>
          Enter the 6-digit code from your phone.{'\n'}Settings → Pair iPad.
        </Body>
      </View>

      <CodeEntry value={code} onChange={(v) => { tapLight(); setCode(v); }} onSubmit={() => void redeem()} />

      <Caption style={{ textAlign: 'center', marginTop: spacing.lg }}>
        {loading ? 'Pairing…' : code.length === 6 ? 'Tap to continue' : 'Tap the last box to continue.'}
      </Caption>
    </Screen>
  );
}
