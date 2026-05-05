import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { saveKidAuth } from '../../src/lib/secureStore';
import { setMode } from '../../src/lib/mode';
import { resetClients } from '../../src/lib/supabase';
import { getPairingRedeemUrl } from '../../src/lib/server';

export default function KidPair() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function redeem() {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Enter a 6-digit code');
      return;
    }
    setLoading(true);
    let url: string;
    try {
      url = getPairingRedeemUrl();
    } catch (e: unknown) {
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
      router.replace('/(kid)/display');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 22 }}>Pair this iPad</Text>
      <Text>Enter the 6-digit code shown on the parent phone.</Text>
      <TextInput
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 12,
          fontSize: 32,
          letterSpacing: 6,
          textAlign: 'center',
          borderRadius: 8,
        }}
      />
      <Button
        title={loading ? 'Pairing…' : 'Pair'}
        onPress={() => void redeem()}
        disabled={loading || code.length !== 6}
      />
    </View>
  );
}
