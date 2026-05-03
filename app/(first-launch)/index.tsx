import { useRouter } from 'expo-router';
import { Button, Text, View } from 'react-native';

export default function ModeChooser() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 24 }}>{`Who's setting up?`}</Text>
      <Button title="Parent" onPress={() => router.push('/(first-launch)/parent-auth')} />
      <Button title="Kid iPad" onPress={() => router.push('/(first-launch)/kid-pair')} />
    </View>
  );
}
