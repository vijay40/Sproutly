import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';

export default function KidLayout() {
  const router = useRouter();

  useEffect(() => {
    if (__DEV__) return;
    let cancelled = false;
    void (async () => {
      const { data } = await getParentClient().auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        router.replace('/(first-launch)/parent-auth');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
