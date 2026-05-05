import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { consumeAuthSessionFromUrl, getParentClient } from '../../src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function getOAuthRedirectUrl(): string {
  // Let Expo pick the scheme at runtime:
  //   Expo Go → exp://<LAN>:8081/--/auth-callback
  //   Dev/prod build → sproutly://auth-callback (from app.json scheme)
  return Linking.createURL('auth-callback');
}

export default function ParentAuth() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = getParentClient();
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        setHasSession(!!data.session);
      })
      .finally(() => setBooting(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setBusy(true);
    try {
      const supabase = getParentClient();
      const redirectTo = getOAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        Alert.alert('Google sign-in failed', error.message);
        return;
      }
      if (!data.url) {
        Alert.alert('Google sign-in failed', 'No OAuth URL returned.');
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        await consumeAuthSessionFromUrl(result.url);
        setHasSession(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Google sign-in failed', msg);
    } finally {
      setBusy(false);
    }
  }, []);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 22 }}>{hasSession ? 'Signed in' : 'Sign in'}</Text>
      {hasSession ? (
        <Text>Signed in with Google. Continue to set up your family.</Text>
      ) : (
        <Text>Continue with your Google account.</Text>
      )}
      {!hasSession ? (
        <Button
          title={busy ? 'Opening browser…' : 'Continue with Google'}
          onPress={signInWithGoogle}
          disabled={busy}
        />
      ) : null}
      {hasSession ? (
        <Button title="Continue to setup" onPress={() => router.replace('/(first-launch)/parent-onboarding')} />
      ) : null}
    </View>
  );
}
