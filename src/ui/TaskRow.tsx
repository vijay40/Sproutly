import { View, ViewStyle, StyleProp } from 'react-native';
import { ReactNode } from 'react';
import { colors, spacing } from '../theme/tokens';
import { Card } from './Card';
import { BodyEmphasis, Caption, Text } from './Text';
import { IconTile } from './IconTile';

type Variant = 'default' | 'bonus' | 'completed';

const TILE_TINTS: Array<'sky' | 'peach' | 'lavender' | 'sage'> = ['sky', 'peach', 'lavender', 'sage'];

function tintFor(key: string): 'sky' | 'peach' | 'lavender' | 'sage' {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TILE_TINTS[Math.abs(hash) % TILE_TINTS.length];
}

interface Props {
  icon: string | null;
  title: string;
  subtitle?: string;
  trailing: ReactNode;
  variant?: Variant;
  bonusBadge?: boolean;
  tint?: 'sky' | 'peach' | 'lavender' | 'sage';
  style?: StyleProp<ViewStyle>;
}

export function TaskRow({
  icon,
  title,
  subtitle,
  trailing,
  variant = 'default',
  bonusBadge = false,
  tint,
  style,
}: Props) {
  const completed = variant === 'completed';
  const resolvedTint = tint ?? tintFor(title);
  return (
    <Card variant={variant} style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }, style]}>
      <IconTile tint={resolvedTint} size={36} radius={9} emoji={icon ?? '•'} />

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <BodyEmphasis
            color={completed ? 'muted' : 'ink'}
            style={completed ? { textDecorationLine: 'line-through' } : undefined}
          >
            {title}
          </BodyEmphasis>
          {bonusBadge && (
            <View
              style={{
                marginLeft: spacing.xs,
                paddingVertical: 2,
                paddingHorizontal: 8,
                backgroundColor: colors.gold,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                    fontFamily: 'LexendDeca-Bold',
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
