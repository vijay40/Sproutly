import { View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { spacing } from '../theme/tokens';
import { BodyEmphasis } from './Text';

interface Props {
  title: string;
  trailing?: ReactNode;
  style?: ViewStyle;
}

export function SectionHeader({ title, trailing, style }: Props) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.xxl,
          marginBottom: spacing.sm,
        },
        style,
      ]}
    >
      <BodyEmphasis>{title}</BodyEmphasis>
      {trailing}
    </View>
  );
}
