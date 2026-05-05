import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, Text, View } from 'react-native';
import { getMode } from '../../src/lib/mode';
import { getParentClient } from '../../src/lib/supabase';

export default function ModeChooser() {
  const router = useRouter();
  const [parentSignedIn, setParentSignedIn] = useState(false);
  const [checkingMode, setCheckingMode] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mode = await getMode();
      if (cancelled) return;
      if (mode === 'parent') {
        router.replace('/(parent)/today');
        return;
      }
      if (mode === 'kid') {
        router.replace('/(kid)/display');
        return;
      }
      setCheckingMode(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void getParentClient()
        .auth.getSession()
        .then(({ data }) => setParentSignedIn(!!data.session));
    }, [])
  );

  function goParent() {
    if (parentSignedIn) {
      router.replace('/(first-launch)/parent-onboarding');
    } else {
      router.push('/(first-launch)/parent-auth');
    }
  }

  if (checkingMode) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 24 }}>{`Who's setting up?`}</Text>
      <Button title="Parent" onPress={goParent} />
      <Button title="Kid iPad" onPress={() => router.push('/(first-launch)/kid-pair')} />
    </View>
  );
}
