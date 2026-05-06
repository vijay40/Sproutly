import { View, ViewStyle, StyleSheet } from 'react-native';
import { ReactNode } from 'react';
import { colors, radii, spacing } from '../theme/tokens';

type Variant = 'default' | 'insight' | 'bonus' | 'completed' | 'screen';

interface Props {
  variant?: Variant;
  children: ReactNode;
  style?: ViewStyle;
}

export function Card({ variant = 'default', children, style }: Props) {
  return <View style={[styles.base, variants[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
    padding: spacing.md,
  },
});

const variants: Record<Variant, ViewStyle> = {
  default: { backgroundColor: colors.gray50 },
  insight: { backgroundColor: colors.sky },
  bonus: {
    backgroundColor: colors.gray50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.goldBorder,
  },
  completed: { backgroundColor: colors.gray50, opacity: 0.65 },
  screen: {
    backgroundColor: colors.white,
    borderRadius: radii.screen,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
};
