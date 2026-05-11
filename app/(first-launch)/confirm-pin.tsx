import { useState } from 'react';
import { Alert, Pressable, Text as RNText, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Body,
  Heading,
  Icons,
  PinDots,
  PinPad,
  Screen,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';
import { setPin as savePin } from '../../src/lib/kidLock';

export default function ConfirmPin() {
  const router = useRouter();
  const { first } = useLocalSearchParams<{ first: string }>();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  async function onDigit(d: string) {
    if (pin.length >= 4) return;
    setError(false);
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      if (next === first) {
        try {
          await savePin(next);
        } catch (e) {
          Alert.alert('Could not save PIN', e instanceof Error ? e.message : 'Unknown error');
          setPin('');
          return;
        }
        router.replace('/(parent)/today');
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 700);
      }
    }
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

      <Heading style={{ textAlign: 'center', color: error ? '#B91C1C' : colors.ink }}>
        {error ? "PINs don't match" : 'Confirm your PIN'}
      </Heading>
      <Body color="muted" style={{ textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg }}>
        {error ? 'Try again.' : 'Enter the same 4 digits again to confirm.'}
      </Body>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <PinDots filled={pin.length} error={error} />
      </View>

      <PinPad
        onDigit={(d) => void onDigit(d)}
        onBackspace={() => setPin((p) => p.slice(0, -1))}
      />

      <View style={{ flex: 1 }} />
    </Screen>
  );
}
