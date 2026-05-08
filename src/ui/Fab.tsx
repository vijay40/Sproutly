import { Pressable, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { PlusIcon } from './icons';

interface Props {
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Fab({ onPress, size = 48, style, accessibilityLabel = 'Add' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.purple,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.purple,
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        style,
      ]}
    >
      <PlusIcon size={24} color={colors.white} />
    </Pressable>
  );
}
