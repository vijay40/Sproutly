import { View, ViewStyle, StyleProp } from 'react-native';
import { ReactNode } from 'react';
import { colors, radii, spacing } from '../theme/tokens';
import { Card } from './Card';
import { BodyEmphasis, Caption, Text } from './Text';

interface Props {
  icon: string | null;
  title: string;
  subtitle?: string;
  trailing: ReactNode;
  variant?: 'default' | 'bonus' | 'completed';
  bonusBadge?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TaskRow({ icon, title, subtitle, trailing, variant = 'default', bonusBadge = false, style }: Props) {
  const completed = variant === 'completed';
  return (
    <Card variant={variant} style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }, style]}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radii.input,
          backgroundColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: completed ? 0.6 : 1,
        }}
      >
        <Text style={{ fontSize: 22 }}>{icon ?? '•'}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <BodyEmphasis
            color={completed ? 'muted' : 'navyInk'}
            style={
              completed
                ? { textDecorationLine: 'line-through', textDecorationColor: colors.strike }
                : undefined
            }
          >
            {title}
          </BodyEmphasis>
          {bonusBadge && (
            <View
              style={{
                marginLeft: spacing.xs,
                paddingVertical: 2,
                paddingHorizontal: 7,
                backgroundColor: colors.gold,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: 'Inter-Bold',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
                color="goldInk"
              >
                BONUS
              </Text>
            </View>
          )}
        </View>
        {subtitle ? <Caption style={{ marginTop: 1 }}>{subtitle}</Caption> : null}
      </View>

      {trailing}
    </Card>
  );
}
