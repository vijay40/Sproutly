import { Text as RNText, View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radii } from '../theme/tokens';

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
  radius?: number;
  emoji?: string;
  children?: ReactNode;
  style?: ViewStyle;
}

export function IconTile({ tint = 'lavender', size = 40, radius, emoji, children, style }: Props) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius ?? radii.input,
          backgroundColor: TINTS[tint],
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {emoji ? <RNText style={{ fontSize: Math.round(size * 0.55), lineHeight: Math.round(size * 0.7) }}>{emoji}</RNText> : children}
    </View>
  );
}
