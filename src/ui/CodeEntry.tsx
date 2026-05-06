import { useRef } from 'react';
import { TextInput, View, Pressable } from 'react-native';
import { colors, radii, typography } from '../theme/tokens';
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

  return (
    <Pressable onPress={focus} accessibilityLabel="Enter 6-digit pairing code">
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        {digits.map((d, i) => {
          const filled = !!d;
          return (
            <View
              key={i}
              style={{
                width: 48,
                height: 60,
                borderRadius: radii.input,
                borderWidth: 2,
                borderColor: filled ? colors.cobalt : colors.gray100,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.white,
              }}
            >
              <Text style={typography.codeDigit} color="navyInk">
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
        // Off-screen but still focusable so the system keyboard opens.
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
      />
    </Pressable>
  );
}
