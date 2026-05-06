import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getParentClient } from '../../src/lib/supabase';
import { tapLight } from '../../src/lib/haptics';
import { Caption, Display, Text } from '../../src/ui';
import { colors, radii, spacing } from '../../src/theme/tokens';

export default function ModeChooser() {
  const router = useRouter();

  // Convenience: if the parent is already signed in (e.g., restored session after a crash),
  // skip straight to onboarding when they tap "Parent's phone". Nothing here reads that session yet,
  // but we can short-circuit to onboarding anyway.
  useEffect(() => {
    void getParentClient().auth.getSession();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, padding: spacing.wide, paddingTop: spacing.section, paddingBottom: spacing.wide }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.s }}>
        <View
          style={{
            width: 92, height: 92, borderRadius: 46,
            backgroundColor: colors.sky,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing.xl,
          }}
        >
          <Text style={{ fontSize: 48 }}>🦄</Text>
        </View>
        <Display style={{ textAlign: 'center', fontSize: 32 }}>Welcome to Sproutly</Display>
        <Caption style={{ textAlign: 'center', marginTop: spacing.xs, maxWidth: 280, fontSize: 15 }}>
          What kind of device is this?
        </Caption>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Parent's phone"
          onPress={() => {
            tapLight();
            router.push('/(first-launch)/parent-auth');
          }}
          style={({ pressed }) => [
            {
              padding: spacing.xl,
              backgroundColor: colors.cobalt,
              borderRadius: radii.card,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22 }}>📱</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold', fontSize: 16 }}>Parent's phone</Text>
            <Text style={{ color: colors.white, opacity: 0.8, fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 2 }}>
              Set up tasks and manage the routine
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kid iPad"
          onPress={() => {
            tapLight();
            router.push('/(first-launch)/kid-pair');
          }}
          style={({ pressed }) => [
            {
              padding: spacing.xl,
              backgroundColor: colors.gray50,
              borderRadius: radii.card,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.white,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22 }}>📟</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.navyInk, fontFamily: 'Inter-Bold', fontSize: 16 }}>Kid iPad</Text>
            <Caption style={{ marginTop: 2 }}>Displays the unicorn and today's tasks</Caption>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
