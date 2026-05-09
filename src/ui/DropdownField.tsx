import { Pressable, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, spacing } from '../theme/tokens';
import { Body, Caption, Text } from './Text';
import { tapLight } from '../lib/haptics';

const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 32,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

interface Props {
  label?: string;
  value: string | null;
  placeholder?: string;
  onPress: () => void;
  hint?: string;
  style?: ViewStyle;
}

function ChevronTile() {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.purpleWash,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={10} height={6} viewBox="0 0 10 6" fill="none">
        <Path
          d="M 1 1 L 5 5 L 9 1"
          stroke={colors.purple}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export function DropdownField({ label, value, placeholder = 'Select…', onPress, hint, style }: Props) {
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label ? `${label}: ${value ?? placeholder}` : value ?? placeholder}
      style={({ pressed }) => [
        {
          backgroundColor: colors.white,
          borderRadius: radii.card,
          paddingLeft: spacing.md + 4,
          paddingRight: 14,
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.95 : 1,
          ...SHADOW,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        {label ? <Caption style={{ marginBottom: 2 }}>{label}</Caption> : null}
        <Text
          kind="bodyEmphasis"
          color={value ? 'ink' : 'muted'}
          style={{ fontSize: 16, lineHeight: 22 }}
        >
          {value ?? placeholder}
        </Text>
        {hint ? <Caption style={{ marginTop: 2 }}>{hint}</Caption> : null}
      </View>
      <ChevronTile />
    </Pressable>
  );
}
