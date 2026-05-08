import { Pressable, View } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  accessibilityLabel?: string;
}

export function Toggle({ value, onChange, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: value ? colors.purple : colors.toggleOff,
        padding: 2,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.white,
          transform: [{ translateX: value ? 20 : 0 }],
        }}
      />
    </Pressable>
  );
}
