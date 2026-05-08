import { View, ViewStyle, StyleProp } from 'react-native';
import { ReactNode } from 'react';
import { colors, radii, spacing } from '../theme/tokens';

type Variant = 'default' | 'bonus' | 'completed';

interface Props {
  variant?: Variant;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 32,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

export function Card({ variant = 'default', children, style }: Props) {
  const variantStyle: ViewStyle =
    variant === 'bonus'
      ? {
          backgroundColor: colors.white,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.goldBorder,
        }
      : variant === 'completed'
        ? { backgroundColor: colors.white, opacity: 0.75 }
        : { backgroundColor: colors.white };
  return (
    <View
      style={[
        {
          borderRadius: radii.card,
          padding: spacing.md,
          ...SHADOW,
        },
        variantStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}
