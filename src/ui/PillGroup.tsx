import { Pressable, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { Text } from './Text';

export interface PillOption<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  options: PillOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
  equalWidth?: boolean;
  style?: ViewStyle;
}

export function PillGroup<T extends string | number>({ options, value, onChange, equalWidth = true, style }: Props<T>) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            style={({ pressed }) => [
              {
                flex: equalWidth ? 1 : undefined,
                minHeight: 44,
                paddingHorizontal: spacing.md,
                borderRadius: radii.input,
                backgroundColor: active ? colors.cobalt : colors.gray50,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text kind="bodyEmphasis" color={active ? 'white' : 'navyInk'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
