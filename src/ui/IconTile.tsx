import { View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radii } from '../theme/tokens';
import { Text } from './Text';

type Tint = 'sky' | 'peach' | 'lavender' | 'sage' | 'purpleWash';

const TINTS: Record<Tint, string> = {
  sky: colors.tileSky,
  peach: colors.tilePeach,
  lavender: colors.tileLavender,
  sage: colors.tileSage,
  purpleWash: colors.purpleWash,
};

interface Props {
  tint?: Tint;
  size?: number;
  emoji?: string;
  children?: ReactNode;
  style?: ViewStyle;
}

export function IconTile({ tint = 'lavender', size = 40, emoji, children, style }: Props) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radii.input,
          backgroundColor: TINTS[tint],
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {emoji ? <Text style={{ fontSize: Math.round(size * 0.55) }}>{emoji}</Text> : children}
    </View>
  );
}
