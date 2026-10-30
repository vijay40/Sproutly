import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, Text as RNText, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Body,
  Heading,
  Icons,
  PinDots,
  PinPad,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';
import { tapLight } from '../../src/lib/haptics';
import {
  clearFailures,
  failureCount,
  hasPin,
  lockoutMsRemaining,
  recordFailure,
  verifyPin,
} from '../../src/lib/kidLock';
import { clearMode, exitKidView } from '../../src/lib/mode';
import { getParentClient } from '../../src/lib/supabase';

function formatMmSs(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function ExitPinScreen() {
  const router = useRouter();
  const [gate, setGate] = useState<'loading' | 'no-pin' | 'pin'>('loading');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [lockMs, setLockMs] = useState(0);
  const shake = useRef(new Animated.Value(0)).current;

  const refreshLockout = useCallback(async () => {
    setLockMs(await lockoutMsRemaining());
  }, []);

  useEffect(() => {
    void (async () => {
      setGate((await hasPin()) ? 'pin' : 'no-pin');
    })();
  }, []);

  useEffect(() => {
    if (gate !== 'pin') return;
    void refreshLockout();
    const t = setInterval(() => {
      void refreshLockout();
    }, 1000);
    return () => clearInterval(t);
  }, [gate, refreshLockout]);

  const runShake = useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  async function onDigit(d: string) {
    if (pin.length >= 4 || lockMs > 0) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length !== 4) return;

    const ok = await verifyPin(next);
    if (ok) {
      await clearFailures();
      await exitKidView();
      router.replace('/(parent)/today');
      return;
    }

    await recordFailure();
    const ms = await lockoutMsRemaining();
    await refreshLockout();
    const fc = await failureCount();
    if (ms === 0) {
      setAttemptsLeft(Math.max(0, 3 - fc));
    } else {
      setAttemptsLeft(0);
    }
    setError(true);
    runShake();
    setTimeout(() => {
      setPin('');
      setError(false);
    }, 500);
  }

  const locked = lockMs > 0;

  if (gate === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (gate === 'no-pin') {
    return (
      <Screen scroll={false}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          style={{ width: 36, height: 36, marginBottom: spacing.md }}
        >
          <Icons.ArrowLeftIcon color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1, paddingTop: spacing.xl, gap: spacing.md }}>
          <Heading style={{ textAlign: 'center' }}>Exit kid view?</Heading>
          <Body color="muted" style={{ textAlign: 'center', paddingHorizontal: spacing.lg }}>
            No PIN is set yet. Anyone with this device can open parent mode from here.
          </Body>
          <PrimaryButton
            title="Exit kid view"
            fullWidth
            onPress={() => {
              tapLight();
              void (async () => {
                await exitKidView();
                router.replace('/(parent)/today');
              })();
            }}
          />
          <SecondaryButton title="Stay in kid view" fullWidth onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Back"
        style={{ width: 36, height: 36, marginBottom: spacing.md }}
      >
        <Icons.ArrowLeftIcon color={colors.ink} />
      </Pressable>

      {locked ? (
        <View style={{ flex: 1, alignItems: 'center', paddingTop: spacing.xl }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <RNText style={{ fontSize: 40 }}>⏱</RNText>
          </View>
          <Heading style={{ textAlign: 'center' }}>Too many attempts</Heading>
          <Body color="muted" style={{ textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg }}>
            Try again in {formatMmSs(lockMs)}
          </Body>
        </View>
      ) : (
        <>
          <View style={{ alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: error ? '#FEE2E2' : colors.purpleWash,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RNText style={{ fontSize: 32 }}>🔒</RNText>
            </View>
          </View>

          <Heading style={{ textAlign: 'center' }}>Enter PIN to exit</Heading>
          <Body color="muted" style={{ textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg }}>
            {error
              ? attemptsLeft > 0
                ? `Incorrect PIN · ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining`
                : 'Incorrect PIN'
              : 'Parents use this to leave kid view.'}
          </Body>

          <Animated.View style={{ marginTop: spacing.xl, marginBottom: spacing.lg, transform: [{ translateX: shake }] }}>
            <PinDots filled={pin.length} error={error} />
          </Animated.View>

          <PinPad
            disabled={locked}
            onDigit={(digit) => void onDigit(digit)}
            onBackspace={() => setPin((p) => p.slice(0, -1))}
          />

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={() => {
              tapLight();
              Alert.alert(
                'Sign out?',
                'If you forgot the PIN, signing out returns to the login screen. You can sign back in and reset the PIN from Settings.',
                [
                  { text: 'Cancel' },
                  {
                    text: 'Sign out',
                    style: 'destructive',
                    onPress: async () => {
                      await clearMode();
                      await getParentClient().auth.signOut();
                      router.replace('/(first-launch)');
                    },
                  },
                ],
              );
            }}
            style={{ alignSelf: 'center', paddingVertical: spacing.md }}
          >
            <Body color="purple" style={{ fontWeight: '600' }}>
              Forgot PIN? Sign out
            </Body>
          </Pressable>
        </>
      )}
    </Screen>
  );
}
