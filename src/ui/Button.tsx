import { Pressable, PressableProps, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { Text } from './Text';

type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

function heightFor(size: ButtonSize): number {
  return size === 'sm' ? 34 : size === 'md' ? 44 : 52;
}

function paddingFor(size: ButtonSize): number {
  return size === 'sm' ? spacing.m : size === 'md' ? spacing.md : spacing.lg;
}

function baseStyle(size: ButtonSize, fullWidth: boolean): ViewStyle {
  return {
    borderRadius: radii.input,
    height: heightFor(size),
    paddingHorizontal: paddingFor(size),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };
}

export function PrimaryButton({ title, size = 'md', fullWidth = false, disabled, style, ...rest }: BaseProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      style={({ pressed }) => [
        baseStyle(size, fullWidth),
        { backgroundColor: colors.purple, opacity: disabled ? 0.4 : pressed ? 0.9 : 1 },
        style,
      ]}
      {...rest}
    >
      <Text kind="bodyEmphasis" color="white">{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, size = 'md', fullWidth = false, disabled, style, ...rest }: BaseProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      style={({ pressed }) => [
        baseStyle(size, fullWidth),
        { backgroundColor: colors.purpleWash, opacity: disabled ? 0.4 : pressed ? 0.9 : 1 },
        style,
      ]}
      {...rest}
    >
      <Text kind="bodyEmphasis" color="purple">{title}</Text>
    </Pressable>
  );
}

export function DangerButton({ title, size = 'md', fullWidth = false, disabled, style, ...rest }: BaseProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      style={({ pressed }) => [
        baseStyle(size, fullWidth),
        {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.dangerBorder,
          opacity: disabled ? 0.4 : pressed ? 0.9 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Text kind="bodyEmphasis" color="danger">{title}</Text>
    </Pressable>
  );
}

export function TextButton({
  title,
  style,
  color = 'muted',
  ...rest
}: BaseProps & { color?: 'muted' | 'purple' | 'ink' }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        { opacity: pressed ? 0.6 : 1, paddingVertical: spacing.s, paddingHorizontal: spacing.m },
        style,
      ]}
      {...rest}
    >
      <Text kind="bodyEmphasis" color={color}>{title}</Text>
    </Pressable>
  );
}
