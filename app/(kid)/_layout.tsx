import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { getKidToken } from '../../src/lib/secureStore';

export default function KidLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getKidToken();
      if (cancelled) return;
      const leaf = segments[segments.length - 1];
      // if (!token && leaf !== 'pair') {
      //   router.replace('/(kid)/pair');
      // } else if (token && leaf === 'pair') {
        // router.replace('/(kid)/display');
      // }
    })();
    return () => { cancelled = true; };
  }, [segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
