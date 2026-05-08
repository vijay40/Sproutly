import { useRef } from 'react';
import { TextInput, View, Pressable } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { Text } from './Text';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
}

const LEN = 6;

export function CodeEntry({ value, onChange, onSubmit }: Props) {
  const inputRef = useRef<TextInput>(null);
  const focus = () => inputRef.current?.focus();
  const digits = Array.from({ length: LEN }, (_, i) => value[i] ?? '');
  const activeIndex = value.length;

  return (
    <Pressable onPress={focus} accessibilityLabel="Enter 6-digit pairing code">
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
        {digits.map((d, i) => {
          const filled = !!d;
          const active = i === activeIndex;
          return (
            <View
              key={i}
              style={{
                width: 44,
                height: 56,
                borderRadius: radii.input,
                borderWidth: 2,
                borderColor: active ? colors.purple : filled ? colors.purple : colors.gray100,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? colors.purpleWash : colors.white,
              }}
            >
              <Text style={{ fontFamily: 'LexendDeca-SemiBold', fontSize: 24, lineHeight: 28 }} color="ink">
                {d}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => {
          const next = t.replace(/\D/g, '').slice(0, LEN);
          onChange(next);
          if (next.length === LEN) onSubmit?.();
        }}
        keyboardType="number-pad"
        maxLength={LEN}
        autoFocus
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
      />
    </Pressable>
  );
}
