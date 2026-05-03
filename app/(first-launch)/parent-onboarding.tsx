import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Text, TextInput, View } from 'react-native';
import { setMode } from '../../src/lib/mode';
import { getParentClient } from '../../src/lib/supabase';

function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function ParentOnboarding() {
  const router = useRouter();
  const [timezone, setTimezone] = useState(guessTimezone());
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = getParentClient();
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) {
      Alert.alert('Not signed in', 'Please sign in first.');
      setSaving(false);
      return;
    }

    const { data: family, error: fErr } = await supabase
      .from('families')
      .insert({ parent_user_id: userId, timezone })
      .select()
      .single();
    if (fErr || !family) {
      Alert.alert('Setup failed', fErr?.message ?? 'Unknown error');
      setSaving(false);
      return;
    }

    const { error: cErr } = await supabase.from('children').insert({
      family_id: family.id,
      name: childName.trim(),
      age: age ? Number(age) : null,
    });
    if (cErr) {
      Alert.alert('Setup failed', cErr.message);
      setSaving(false);
      return;
    }

    await setMode('parent');
    setSaving(false);
    router.replace('/(parent)/today');
  }

  if (saving) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 22 }}>Set up your family</Text>
      <Text>Timezone</Text>
      <TextInput
        value={timezone}
        onChangeText={setTimezone}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8 }}
      />
      <Text>{`Child's name`}</Text>
      <TextInput
        value={childName}
        onChangeText={setChildName}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8 }}
      />
      <Text>Age</Text>
      <TextInput
        value={age}
        onChangeText={setAge}
        keyboardType="number-pad"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8 }}
      />
      <Button title="Done" onPress={save} disabled={!childName} />
    </View>
  );
}
