import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { consumeAuthSessionFromUrl, getParentClient } from '../../src/lib/supabase';
import { Caption, GoogleSignInButton, HeadingLg, Text } from '../../src/ui';
import { colors, radii, spacing } from '../../src/theme/tokens';

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
    <View style={{ flex: 1, backgroundColor: colors.white, padding: spacing.wide, paddingTop: spacing.section }}>
      <Pressable onPress={() => router.back()} style={{ width: 30, height: 30, marginBottom: spacing.section }} accessibilityLabel="Back">
        <Text style={{ color: colors.muted, fontSize: 22, lineHeight: 24 }}>‹</Text>
      </Pressable>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 64, height: 64, borderRadius: radii.card,
            backgroundColor: colors.gray50,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing.xl,
          }}
        >
          <Text style={{ fontSize: 28 }}>🔐</Text>
        </View>
        <HeadingLg style={{ textAlign: 'center' }}>Sign in to Sproutly</HeadingLg>
        <Caption style={{ textAlign: 'center', marginTop: spacing.s, maxWidth: 300 }}>
          Your tasks and insights stay private and encrypted.
        </Caption>
      </View>

      <View style={{ paddingBottom: spacing.wide }}>
        <GoogleSignInButton onPress={() => void signInWithGoogle()} disabled={busy} />
        {hasSession && (
          <Pressable
            onPress={() => router.replace('/(first-launch)/parent-onboarding')}
            style={{ marginTop: spacing.md, alignItems: 'center' }}
          >
            <Caption color="cobalt">Continue to setup</Caption>
          </Pressable>
        )}
        <Caption style={{ textAlign: 'center', marginTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
          By continuing you agree to our Terms &amp; Privacy Policy
        </Caption>
      </View>
    </View>
  );
}
