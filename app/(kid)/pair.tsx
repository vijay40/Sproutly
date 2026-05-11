import { useState } from 'react';
import { Alert, Keyboard, TouchableWithoutFeedback, View } from 'react-native';
import { useRouter } from 'expo-router';
import { saveKidAuth } from '../../src/lib/secureStore';
import { setMode } from '../../src/lib/mode';
import { resetClients } from '../../src/lib/supabase';
import { getPairingRedeemUrl } from '../../src/lib/server';
import { tapLight, tapSuccess } from '../../src/lib/haptics';
import { PrePairScene } from '../../src/ui/kid/scenes/PrePairScene';

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
        'This iPad is missing the API URL. Ask the person who set up the app to add EXPO_PUBLIC_API_URL to .env.local.',
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
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
      <View style={{ flex: 1 }}>
        <PrePairScene
          code={code}
          onChangeCode={(v) => { tapLight(); setCode(v); }}
          onSubmit={() => void redeem()}
          loading={loading}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
