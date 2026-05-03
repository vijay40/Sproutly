import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppMode, getMode } from '../src/lib/mode';
import { consumeAuthSessionFromUrl, getParentClient } from '../src/lib/supabase';

export default function RootLayout() {
  const [mode, setMode] = useState<AppMode | null | 'loading'>('loading');
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: sub } = getParentClient().auth.onAuthStateChange(async (_event, session) => {
      if (session && (await getMode()) === null) {
        // Parent just signed in for the first time — mode is committed after onboarding (Task 5).
      }
    });

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      void consumeAuthSessionFromUrl(url);
    });

    void (async () => {
      await consumeAuthSessionFromUrl(await Linking.getInitialURL());
      getMode().then(setMode);
    })();

    return () => {
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  useEffect(() => {
    if (mode === 'loading') return;
    const inGroup = segments[0];
    if (mode === null && inGroup !== '(first-launch)') {
      router.replace('/(first-launch)');
    } else if (mode === 'parent' && inGroup !== '(parent)') {
      router.replace('/(parent)/today');
    } else if (mode === 'kid' && inGroup !== '(kid)') {
      router.replace('/(kid)/display');
    }
  }, [mode, segments, router]);

  if (mode === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
