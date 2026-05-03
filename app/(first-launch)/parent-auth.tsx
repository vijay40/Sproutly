import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import { getAuthEmailRedirectTo } from '../../src/lib/authRedirect';
import { getParentClient } from '../../src/lib/supabase';

export default function ParentAuth() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function sendLink() {
    setLoading(true);
    const { error } = await getParentClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: getAuthEmailRedirectTo() },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Could not send link', error.message);
      return;
    }
    setSent(true);
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 22 }}>Sign in</Text>
      <Text>{`We'll email you a sign-in link.`}</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8 }}
      />
      <Button title={loading ? 'Sending…' : 'Send link'} onPress={sendLink} disabled={loading || !email} />
      {sent ? <Text>Check your email, then come back here.</Text> : null}
      <Button title={`I'm signed in — continue`} onPress={() => router.replace('/(first-launch)/parent-onboarding')} />
    </View>
  );
}
