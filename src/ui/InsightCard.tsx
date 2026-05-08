import { Pressable, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { BodyEmphasis, Heading, Text } from './Text';
import { TextButton } from './Button';

interface Props {
  text: string;
  chipLabel?: string;
  counter?: { current: number; total: number };
  onApply?: () => void;
  onDismiss?: () => void;
}

export function InsightCard({ text, chipLabel = 'INSIGHT', counter, onApply, onDismiss }: Props) {
  return (
    <View
      style={{
        backgroundColor: colors.purple,
        borderRadius: radii.card,
        padding: spacing.lg,
        marginBottom: spacing.xxxl,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            marginBottom: spacing.s,
          }}
        >
          <Text
            style={{
              fontFamily: 'LexendDeca-SemiBold',
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
            color="white"
          >
            {chipLabel}
          </Text>
        </View>

        <Heading color="white" style={{ marginBottom: spacing.md }}>{text}</Heading>

        {(onApply || onDismiss) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s }}>
            {onApply && (
              <View
                style={{
                  backgroundColor: colors.white,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <TextButton
                  title="Apply"
                  color="purple"
                  onPress={onApply}
                  style={{ paddingVertical: 0, paddingHorizontal: 0 }}
                />
              </View>
            )}
            {onDismiss && (
              <Pressable
                onPress={onDismiss}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.s,
                  paddingVertical: 6,
                  opacity: pressed ? 0.6 : 0.85,
                })}
              >
                <Text kind="bodyEmphasis" color="white">Dismiss</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {counter && (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BodyEmphasis color="white">
            {counter.current}/{counter.total}
          </BodyEmphasis>
        </View>
      )}
    </View>
  );
}
