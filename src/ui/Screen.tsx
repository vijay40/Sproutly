import { ReactNode } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
  bottomGutter?: number;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  contentStyle,
  bottomGutter = 0,
}: Props) {
  const insets = useSafeAreaInsets();
  const horizontal = padded ? spacing.wide : 0;
  const top = insets.top + (padded ? spacing.md : 0);
  const bottom = insets.bottom + bottomGutter + (padded ? spacing.xl : 0);

  if (!scroll) {
    return (
      <View
        style={[
          {
            flex: 1,
            backgroundColor: colors.white,
            paddingHorizontal: horizontal,
            paddingTop: top,
            paddingBottom: bottom,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.white }}
      contentContainerStyle={[
        {
          paddingHorizontal: horizontal,
          paddingTop: top,
          paddingBottom: bottom,
        },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
