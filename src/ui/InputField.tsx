import { TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { Label } from './Text';

interface Props extends TextInputProps {
  label?: string;
}

export function InputField({ label, style, ...rest }: Props) {
  return (
    <View>
      {label ? <Label style={{ marginBottom: spacing.s, paddingLeft: spacing.xxs }}>{label}</Label> : null}
      <View
        style={{
          backgroundColor: colors.gray50,
          borderRadius: radii.card,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
        }}
      >
        <TextInput
          placeholderTextColor={colors.muted}
          style={[
            {
              fontFamily: typography.bodyEmphasis.fontFamily,
              fontSize: 17,
              color: colors.navyInk,
              padding: 0, // RN adds default padding on Android
            },
            style,
          ]}
          {...rest}
        />
      </View>
    </View>
  );
}
