import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Body,
  Heading,
  Icons,
  PinDots,
  PinPad,
  Screen,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';
import { tapLight } from '../../src/lib/haptics';

export default function CreatePin() {
  const router = useRouter();
  const [pin, setPin] = useState('');

  function onDigit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        router.push({ pathname: '/(first-launch)/confirm-pin', params: { first: next } });
      }, 120);
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
            backgroundColor: colors.purpleWash,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RNText style={{ fontSize: 32 }}>🔒</RNText>
        </View>
      </View>

      <Heading style={{ textAlign: 'center' }}>Create a 4-digit PIN</Heading>
      <Body color="muted" style={{ textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg }}>
        You'll enter this to exit kid view. Don't share it with your kid.
      </Body>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <PinDots filled={pin.length} />
      </View>

      <PinPad
        onDigit={onDigit}
        onBackspace={() => setPin((p) => p.slice(0, -1))}
      />

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={() => {
          tapLight();
          router.replace('/(parent)/today');
        }}
        accessibilityRole="button"
        style={{ alignSelf: 'center', paddingVertical: spacing.s, marginBottom: spacing.md }}
      >
        <Body color="muted" style={{ fontWeight: '600' }}>Skip for now</Body>
      </Pressable>
    </Screen>
  );
}
