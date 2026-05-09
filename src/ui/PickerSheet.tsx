import { Pressable, ScrollView, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { BodyEmphasis, Caption, Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { CheckIcon } from './icons';
import { tapLight } from '../lib/haptics';

export interface PickerOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string | number> {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  value: T | null;
  onSelect: (v: T) => void;
  onClose: () => void;
  maxHeight?: number;
}

export function PickerSheet<T extends string | number>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  maxHeight = 440,
}: Props<T>) {
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={maxHeight}>
      <BodyEmphasis style={{ textAlign: 'center', marginBottom: spacing.m }}>{title}</BodyEmphasis>

      <ScrollView showsVerticalScrollIndicator={false}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => {
                tapLight();
                onSelect(opt.value);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: radii.card,
                backgroundColor: active ? colors.purpleWash : pressed ? colors.gray50 : colors.white,
                marginBottom: spacing.xxs,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text kind="bodyEmphasis" color={active ? 'purple' : 'ink'}>
                  {opt.label}
                </Text>
                {opt.hint ? <Caption style={{ marginTop: 2 }}>{opt.hint}</Caption> : null}
              </View>
              {active ? <CheckIcon size={18} color={colors.purple} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}
