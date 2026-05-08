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

export function PillGroup<T extends string | number>({
  options,
  value,
  onChange,
  equalWidth = false,
  style,
}: Props<T>) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s }, style]}>
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
                minHeight: 40,
                paddingHorizontal: spacing.md,
                borderRadius: radii.pill,
                backgroundColor: active ? colors.purple : colors.purpleWash,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text kind="bodyEmphasis" color={active ? 'white' : 'purple'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
