import { useCallback, useState } from 'react';
import { Alert, Pressable, Text as RNText, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Body,
  Card,
  Caption,
  Display,
  Icons,
  PinDots,
  PinPad,
  Screen,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';
import { tapLight } from '../../src/lib/haptics';
import { clearFailures, clearPin, getPin, hasPin, verifyPin } from '../../src/lib/kidLock';

type Step = 'menu' | 'verify-remove' | 'verify-change';

export default function PinSettingsScreen() {
  const router = useRouter();
  const [pinSet, setPinSet] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPinSet(await hasPin());
    setRevealed(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function tryVerify(code: string) {
    const ok = await verifyPin(code);
    if (!ok) {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 600);
      return;
    }
    setPin('');
    setError(false);
    if (step === 'verify-remove') {
      await clearPin();
      await clearFailures();
      setStep('menu');
      void refresh();
      Alert.alert('PIN removed', 'Kid view is no longer protected by a PIN.');
      return;
    }
    if (step === 'verify-change') {
      setStep('menu');
      router.push({
        pathname: '/(first-launch)/create-pin',
        params: { returnTo: '/(parent)/pin-settings' },
      });
    }
  }

  function onDigit(d: string) {
    if (pin.length >= 4) return;
    setError(false);
    const next = pin + d;
    setPin(next);
    if (next.length === 4) void tryVerify(next);
  }

  if (step !== 'menu') {
    return (
      <Screen scroll={false}>
        <Pressable
          onPress={() => {
            setStep('menu');
            setPin('');
            setError(false);
          }}
          accessibilityLabel="Back"
          style={{ width: 36, height: 36, marginBottom: spacing.md }}
        >
          <Icons.ArrowLeftIcon color={colors.ink} />
        </Pressable>
        <Display style={{ textAlign: 'center', marginBottom: spacing.sm }}>
          {step === 'verify-remove' ? 'Enter PIN to remove' : 'Enter current PIN'}
        </Display>
        <Body color="muted" style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          {error ? 'Incorrect PIN' : ' '}
        </Body>
        <PinDots filled={pin.length} error={error} />
        <View style={{ marginTop: spacing.xl }}>
          <PinPad onDigit={onDigit} onBackspace={() => setPin((p) => p.slice(0, -1))} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen bottomGutter={48}>
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Back"
        style={{ width: 36, height: 36, marginBottom: spacing.md }}
      >
        <Icons.ArrowLeftIcon color={colors.ink} />
      </Pressable>
      <Display style={{ marginBottom: spacing.lg }}>Kid-view PIN</Display>

      <SectionHeader title="Protection" />
      <Body color="muted" style={{ marginBottom: spacing.md }}>
        {pinSet
          ? 'A PIN is required to leave kid view on this device.'
          : 'Optional: require a PIN to exit kid view.'}
      </Body>

      {!pinSet ? (
        <PrimaryButton
          title="Set PIN"
          fullWidth
          onPress={() => {
            tapLight();
            router.push({
              pathname: '/(first-launch)/create-pin',
              params: { returnTo: '/(parent)/pin-settings' },
            });
          }}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Caption>Current PIN</Caption>
              <RNText style={{ marginTop: 4, fontSize: 24, letterSpacing: 4, fontWeight: '600', color: colors.ink }}>
                {revealed ?? '••••'}
              </RNText>
            </View>
            <Pressable
              onPress={() => {
                tapLight();
                if (revealed) {
                  setRevealed(null);
                  return;
                }
                void (async () => {
                  const value = await getPin();
                  if (value) setRevealed(value);
                })();
              }}
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Hide PIN' : 'Show PIN'}
              hitSlop={12}
              style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }}
            >
              <Body color="purple" style={{ fontWeight: '600' }}>
                {revealed ? 'Hide' : 'Show'}
              </Body>
            </Pressable>
          </Card>
          <SecondaryButton
            title="Change PIN"
            fullWidth
            onPress={() => {
              tapLight();
              setStep('verify-change');
            }}
          />
          <SecondaryButton
            title="Remove PIN"
            fullWidth
            onPress={() => {
              tapLight();
              setStep('verify-remove');
            }}
          />
        </View>
      )}
    </Screen>
  );
}
