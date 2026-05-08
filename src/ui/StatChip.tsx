import { View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { Caption, Text } from './Text';

type Variant = 'lavender' | 'sage' | 'gold';

const BG: Record<Variant, string> = {
  lavender: colors.tileLavender,
  sage: colors.tileSage,
  gold: colors.gold,
};

const BAR: Record<Variant, string> = {
  lavender: colors.purple,
  sage: colors.sageInk,
  gold: colors.goldInk,
};

const INK: Record<Variant, string> = {
  lavender: colors.purple,
  sage: colors.sageInk,
  gold: colors.goldInk,
};

interface Props {
  value: string;
  label: string;
  variant?: Variant;
  style?: ViewStyle;
}

export function StatChip({ value, label, variant = 'lavender', style }: Props) {
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: BG[variant],
          borderRadius: radii.card,
          padding: spacing.md,
          gap: spacing.xs,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: 'LexendDeca-Bold', fontSize: 26, color: INK[variant] }}>
        {value}
      </Text>
      <Caption style={{ color: INK[variant], opacity: 0.8 }}>{label}</Caption>
      <View
        style={{
          marginTop: 6,
          height: 3,
          width: 40,
          backgroundColor: BAR[variant],
          opacity: 0.4,
          borderRadius: 2,
        }}
      />
    </View>
  );
}
