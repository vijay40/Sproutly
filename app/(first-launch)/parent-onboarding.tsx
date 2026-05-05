import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
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
    if (saving) return;
    Keyboard.dismiss();
    const trimmedName = childName.trim();
    if (!trimmedName) {
      Alert.alert('Missing info', 'Child name is required.');
      return;
    }
    const trimmedAge = age.trim();
    const parsedAge = trimmedAge ? Number.parseInt(trimmedAge, 10) : null;
    if (trimmedAge && Number.isNaN(parsedAge)) {
      Alert.alert('Invalid age', 'Please enter age as a whole number.');
      return;
    }
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
      name: trimmedName,
      age: parsedAge,
    });
    if (cErr) {
      // Keep onboarding consistent: if child creation fails, remove the family row we just created.
      await supabase.from('families').delete().eq('id', family.id);
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingBottom: 48,
          justifyContent: 'center',
          gap: 12,
        }}
      >
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
          returnKeyType="next"
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8 }}
        />
        <Text>Age</Text>
        <TextInput
          value={age}
          onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          blurOnSubmit
          onSubmitEditing={Keyboard.dismiss}
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8 }}
        />
        <Button title="Done" onPress={() => void save()} disabled={!childName.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
