import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { consumeAuthSessionFromUrl, getParentClient } from '../../src/lib/supabase';
import {
  Body,
  Caption,
  Display,
  GoogleSignInButton,
  IconTile,
  Icons,
  Screen,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

function getOAuthRedirectUrl(): string {
  return Linking.createURL('auth-callback');
}

export default function ParentAuth() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    getParentClient().auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setBusy(true);
    try {
      const redirectTo = getOAuthRedirectUrl();
      const { data, error } = await getParentClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) { Alert.alert('Google sign-in failed', error.message); return; }
      if (!data.url) { Alert.alert('Google sign-in failed', 'No OAuth URL returned.'); return; }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        await consumeAuthSessionFromUrl(result.url);
        setHasSession(true);
        router.replace('/(first-launch)/parent-onboarding');
      }
    } catch (e: unknown) {
      Alert.alert('Google sign-in failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [router]);

  return (
    <Screen scroll={false}>
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Back"
        style={{ width: 36, height: 36, marginBottom: spacing.xl }}
      >
        <Icons.ArrowLeftIcon color={colors.ink} />
      </Pressable>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <IconTile tint="purpleWash" size={80} style={{ borderRadius: 40, marginBottom: spacing.xl }} emoji="👋" />
        <Display style={{ textAlign: 'center' }}>Let's sign you in</Display>
        <Body color="muted" style={{ textAlign: 'center', marginTop: spacing.s, maxWidth: 300 }}>
          Parents sign in with Google. Kid view uses the same account — no separate kid login.
        </Body>
      </View>

      <View style={{ paddingBottom: spacing.wide, gap: spacing.md }}>
        <GoogleSignInButton onPress={() => void signInWithGoogle()} disabled={busy} />
        {hasSession && (
          <Pressable
            onPress={() => router.replace('/(first-launch)/parent-onboarding')}
            style={{ alignItems: 'center' }}
          >
            <Caption color="purple">Continue to setup</Caption>
          </Pressable>
        )}
        <Caption style={{ textAlign: 'center', marginTop: spacing.s }}>
          By continuing you agree to the Sproutly terms.
        </Caption>
      </View>
    </Screen>
  );
}
