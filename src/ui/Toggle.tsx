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
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: value ? colors.cobalt : colors.toggleOff,
        padding: 2,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.white,
          transform: [{ translateX: value ? 18 : 0 }],
        }}
      />
    </Pressable>
  );
}
