import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../theme/tokens';

type TextKind = 'display' | 'heading' | 'headingSm' | 'body' | 'bodyEmphasis' | 'caption' | 'label';

interface Props extends TextProps {
  kind?: TextKind;
  color?: keyof typeof colors;
}

export function Text({ kind = 'body', color = 'ink', style, ...rest }: Props) {
  return <RNText style={[styles[kind], { color: colors[color] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: typography.display,
  heading: typography.heading,
  headingSm: typography.headingSm,
  body: typography.body,
  bodyEmphasis: typography.bodyEmphasis,
  caption: typography.caption,
  label: typography.label,
});

export const Display = (p: Props) => <Text {...p} kind="display" />;
export const Heading = (p: Props) => <Text {...p} kind="heading" />;
export const HeadingSm = (p: Props) => <Text {...p} kind="headingSm" />;
export const Body = (p: Props) => <Text {...p} kind="body" />;
export const BodyEmphasis = (p: Props) => <Text {...p} kind="bodyEmphasis" />;
export const Caption = (p: Props) => <Text {...p} kind="caption" color="muted" />;
export const Label = (p: Props) => <Text {...p} kind="label" color="muted" />;
