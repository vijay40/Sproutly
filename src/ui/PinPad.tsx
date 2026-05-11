import { useMemo } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { colors } from '../theme/tokens';
import { tapLight } from '../lib/haptics';

const KEYS: Array<{ label: string; value?: string; kind?: 'digit' | 'back' }> = [
  { label: '1', value: '1', kind: 'digit' },
  { label: '2', value: '2', kind: 'digit' },
  { label: '3', value: '3', kind: 'digit' },
  { label: '4', value: '4', kind: 'digit' },
  { label: '5', value: '5', kind: 'digit' },
  { label: '6', value: '6', kind: 'digit' },
  { label: '7', value: '7', kind: 'digit' },
  { label: '8', value: '8', kind: 'digit' },
  { label: '9', value: '9', kind: 'digit' },
  { label: '' },
  { label: '0', value: '0', kind: 'digit' },
  { label: '⌫', kind: 'back' },
];

export function PinDots({
  filled,
  total = 4,
  error = false,
}: {
  filled: number;
  total?: number;
  error?: boolean;
}) {
  const dots = useMemo(() => Array.from({ length: total }), [total]);
  const fillColor = error ? '#EF4444' : colors.purple;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
      {dots.map((_, i) => (
        <View
          key={i}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: i < filled ? fillColor : `${fillColor}26`,
          }}
        />
      ))}
    </View>
  );
}

export function PinPad({
  onDigit,
  onBackspace,
  disabled = false,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: 24,
        rowGap: 16,
      }}
    >
      {KEYS.map((k, i) => {
        if (!k.label) return <View key={i} style={{ width: 72, height: 72 }} />;
        return (
          <Pressable
            key={i}
            disabled={disabled}
            onPress={() => {
              tapLight();
              if (k.kind === 'digit' && k.value) onDigit(k.value);
              else if (k.kind === 'back') onBackspace();
            }}
            accessibilityRole="button"
            accessibilityLabel={k.kind === 'back' ? 'Delete' : k.label}
            style={({ pressed }) => ({
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: pressed ? '#EDEBF5' : '#F5F4FA',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.5 : 1,
            })}
          >
            <RNText
              style={{
                fontSize: k.kind === 'back' ? 22 : 28,
                fontFamily: 'LexendDeca-SemiBold',
                color: colors.ink,
              }}
            >
              {k.label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}
