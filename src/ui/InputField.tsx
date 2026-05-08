import { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { Label } from './Text';

interface Props extends TextInputProps {
  label?: string;
}

export function InputField({ label, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label ? <Label style={{ marginBottom: spacing.s }}>{label}</Label> : null}
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radii.card,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderWidth: 1.5,
          borderColor: focused ? colors.purple : colors.gray100,
        }}
      >
        <TextInput
          placeholderTextColor={colors.muted}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[
            {
              fontFamily: typography.bodyEmphasis.fontFamily,
              fontSize: 16,
              color: colors.ink,
              padding: 0,
            },
            style,
          ]}
          {...rest}
        />
      </View>
    </View>
  );
}
