import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { getParentClient } from '../../src/lib/supabase';

export default function FirstLaunchIndex() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await getParentClient().auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        router.replace('/(first-launch)/parent-auth');
        return;
      }
      try {
        const me = await api.me.get();
        if (cancelled) return;
        if (!me.has_onboarded) {
          router.replace('/(first-launch)/parent-onboarding');
          return;
        }
      } catch {
        if (cancelled) return;
        router.replace('/(first-launch)/parent-onboarding');
        return;
      }
      if (!cancelled) router.replace('/(parent)/today');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator />
    </View>
  );
}
