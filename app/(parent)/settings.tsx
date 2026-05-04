import { View, Text, Button, Alert } from 'react-native';
import { getParentClient } from '../../src/lib/supabase';
import { clearMode } from '../../src/lib/mode';
import { useRouter } from 'expo-router';

export default function Settings() {
  const router = useRouter();
  async function signOut() {
    await getParentClient().auth.signOut();
    await clearMode();
    router.replace('/(first-launch)');
  }
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text>Settings</Text>
      <Button title="Pair an iPad" onPress={() => Alert.alert('Coming next task')} />
      <Button title="Sign out & reset device" onPress={signOut} color="red" />
    </View>
  );
}
