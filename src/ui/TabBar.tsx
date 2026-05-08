import { View, Pressable } from 'react-native';
import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radii, spacing } from '../theme/tokens';
import { BodyEmphasis } from './Text';
import { HomeIcon, ClipIcon, ChartIcon, GearIcon } from './icons';
import { Fab } from './Fab';
import { tapLight } from '../lib/haptics';

type SlotKey = 'today' | 'tasks' | 'insights' | 'settings';

const SLOT_ORDER: SlotKey[] = ['today', 'tasks', 'insights', 'settings'];

const LABELS: Record<SlotKey, string> = {
  today: 'Today',
  tasks: 'Tasks',
  insights: 'Insights',
  settings: 'Settings',
};

function iconFor(key: SlotKey, color: string) {
  switch (key) {
    case 'today':    return <HomeIcon size={22} color={color} />;
    case 'tasks':    return <ClipIcon size={22} color={color} />;
    case 'insights': return <ChartIcon size={22} color={color} />;
    case 'settings': return <GearIcon size={22} color={color} />;
  }
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const currentRouteName = state.routes[state.index]?.name;

  function navigate(key: SlotKey) {
    tapLight();
    navigation.navigate(key);
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: insets.bottom + spacing.s,
        backgroundColor: colors.purpleWash,
        borderRadius: radii.screen,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.s,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {SLOT_ORDER.slice(0, 2).map((key) => (
        <SlotButton
          key={key}
          label={LABELS[key]}
          active={currentRouteName === key}
          onPress={() => navigate(key)}
          icon={(color) => iconFor(key, color)}
        />
      ))}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Fab
          onPress={() => {
            tapLight();
            router.push('/(parent)/task-edit');
          }}
          accessibilityLabel="Add task"
        />
      </View>

      {SLOT_ORDER.slice(2).map((key) => (
        <SlotButton
          key={key}
          label={LABELS[key]}
          active={currentRouteName === key}
          onPress={() => navigate(key)}
          icon={(color) => iconFor(key, color)}
        />
      ))}
    </View>
  );
}

interface SlotProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: (color: string) => ReactNode;
}

function SlotButton({ label, active, onPress, icon }: SlotProps) {
  const color = active ? colors.purple : colors.muted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
      }}
    >
      {icon(color)}
      {active ? (
        <BodyEmphasis color="purple">{label}</BodyEmphasis>
      ) : null}
    </Pressable>
  );
}
