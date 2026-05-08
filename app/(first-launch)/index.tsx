import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { tapLight } from '../../src/lib/haptics';
import {
  Body,
  Display,
  IconTile,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme/tokens';

export default function ModeChooser() {
  const router = useRouter();

  useEffect(() => {
    void getParentClient().auth.getSession();
  }, []);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ position: 'absolute', top: 40, left: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.purpleWash }} />
        <View style={{ position: 'absolute', top: 140, right: 10, width: 50, height: 50, borderRadius: 25, backgroundColor: colors.tilePeach }} />
        <View style={{ position: 'absolute', bottom: 220, left: 40, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tileSage }} />

        <IconTile tint="purpleWash" size={160} style={{ borderRadius: 80, marginBottom: spacing.xl }} emoji="🦄" />

        <Display style={{ textAlign: 'center' }}>Welcome to Sproutly</Display>
        <Body color="muted" style={{ textAlign: 'center', marginTop: spacing.s, maxWidth: 280 }}>
          How are you setting up this device?
        </Body>
      </View>

      <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        <PrimaryButton
          title="I'm setting up my phone"
          size="lg"
          fullWidth
          onPress={() => {
            tapLight();
            router.push('/(first-launch)/parent-auth');
          }}
        />
        <SecondaryButton
          title="I'm setting up a kid's iPad"
          size="lg"
          fullWidth
          onPress={() => {
            tapLight();
            router.push('/(first-launch)/kid-pair');
          }}
        />
        <Text kind="caption" color="muted" style={{ textAlign: 'center', marginTop: spacing.s }}>
          You'll only choose this once per device.
        </Text>
      </View>
    </Screen>
  );
}
