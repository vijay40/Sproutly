import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { saveKidAuth } from '../../src/lib/secureStore';
import { setMode } from '../../src/lib/mode';
import { resetClients } from '../../src/lib/supabase';
import { getPairingRedeemUrl } from '../../src/lib/server';
import { tapLight, tapSuccess } from '../../src/lib/haptics';
import {
  Caption,
  CodeEntry,
  HeadingLg,
  Text,
} from '../../src/ui';
import { colors, radii, spacing } from '../../src/theme/tokens';

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
    <View style={{ flex: 1, backgroundColor: colors.white, padding: spacing.wide, paddingTop: spacing.section }}>
      <Pressable onPress={() => router.back()} style={{ width: 30, height: 30, marginBottom: spacing.wide }} accessibilityLabel="Back">
        <Text style={{ color: colors.muted, fontSize: 22, lineHeight: 24 }}>‹</Text>
      </Pressable>

      <View style={{ alignItems: 'center', marginBottom: spacing.section }}>
        <View
          style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: colors.sky,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ fontSize: 32 }}>📟</Text>
        </View>
        <HeadingLg style={{ textAlign: 'center' }}>Pair this iPad</HeadingLg>
        <Caption style={{ textAlign: 'center', marginTop: spacing.s, maxWidth: 280 }}>
          Enter the 6-digit code from the parent's phone (Settings → Pair iPad).
        </Caption>
      </View>

      <CodeEntry
        value={code}
        onChange={(v) => { tapLight(); setCode(v); }}
        onSubmit={() => void redeem()}
      />
      <Caption style={{ textAlign: 'center', marginTop: spacing.md }}>
        {loading ? 'Pairing…' : 'Codes expire after 10 minutes.'}
      </Caption>

      <View style={{ flex: 1 }} />

      <View
        style={{
          backgroundColor: colors.gray50,
          borderRadius: radii.card,
          padding: spacing.md,
          alignItems: 'center',
        }}
      >
        <Caption>Enter 6-digit code above</Caption>
      </View>
    </View>
  );
}
