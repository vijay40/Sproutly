import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppMode, exitKidView, getMode } from '../src/lib/mode';
import { api } from '../src/lib/api';
import { consumeAuthSessionFromUrl, getParentClient } from '../src/lib/supabase';
import { useAppFonts } from '../src/fonts';

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const [mode, setMode] = useState<AppMode | null | 'loading'>('loading');
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: sub } = getParentClient().auth.onAuthStateChange(async () => {
      // Mode is committed after onboarding (parent-onboarding).
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
    let cancelled = false;
    void (async () => {
      const stored = await getMode();
      if (cancelled) return;
      if (stored !== mode) {
        setMode(stored);
        return;
      }
      const inGroup = segments[0];
      if (stored === null && inGroup !== '(first-launch)' && inGroup !== '(kid)') {
        router.replace('/(first-launch)');
      } else if (stored === 'parent') {
        const { data } = await getParentClient().auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          router.replace('/(first-launch)/parent-auth');
          return;
        }
        let familyId: string | null = null;
        try {
          const me = await api.me.get();
          familyId = me.family_id;
          console.log('[layout] /me OK — family_id:', familyId);
        } catch (e) {
          console.warn('[layout] /me failed:', e instanceof Error ? e.message : String(e));
          familyId = null;
        }
        if (cancelled) return;
        if (!familyId) {
          router.replace('/(first-launch)/parent-onboarding');
          return;
        }
        if (inGroup !== '(parent)' && inGroup !== '(kid)' && inGroup !== '(first-launch)') {
          router.replace('/(parent)/today');
        }
      } else if (stored === 'kid') {
        const { data } = await getParentClient().auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          await exitKidView();
          router.replace('/(first-launch)/parent-auth');
          return;
        }
        if (inGroup !== '(kid)') {
          router.replace('/(kid)/display');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, segments, router]);

  if (!fontsLoaded || mode === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />;
}
