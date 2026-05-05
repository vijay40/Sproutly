import { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { getParentClient } from '../../src/lib/supabase';
import { clearMode } from '../../src/lib/mode';
import { useRouter } from 'expo-router';

export default function Settings() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);

  async function generateCode() {
    const { data, error } = await getParentClient().rpc('create_pairing_code');
    if (error) return Alert.alert('Error', error.message);
    const row = Array.isArray(data) ? data[0] : data;
    setCode(row?.pairing_code ?? null);
    setExpires(row?.expires_at ?? null);
  }

  async function signOut() {
    await getParentClient().auth.signOut();
    await clearMode();
    router.replace('/(first-launch)');
  }
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18 }}>Settings</Text>
      <Button title="Pair an iPad" onPress={() => void generateCode()} />
      {code && (
        <View>
          <Text style={{ fontSize: 14, color: '#666' }}>Enter this on the iPad:</Text>
          <Text style={{ fontSize: 48, letterSpacing: 6, textAlign: 'center', marginTop: 8 }}>{code}</Text>
          {expires && (
            <Text style={{ textAlign: 'center', color: '#666' }}>
              Expires at {new Date(expires).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
      <View style={{ height: 24 }} />
      <Button title="Sign out & reset device" onPress={signOut} color="red" />
    </View>
  );
}
