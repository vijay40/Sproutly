import { Pressable, View } from 'react-native';
import { colors, spacing } from '../../src/theme/tokens';
import { BodyEmphasis, Caption, IconTile, Text } from '../../src/ui';

interface Props {
  greeting: string;
}

export function TodayTopHeader({ greeting }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
        <IconTile tint="purpleWash" size={46} radius={23}>
          <Text
            style={{
              fontFamily: 'LexendDeca-SemiBold',
              fontSize: 18,
              lineHeight: 24,
              color: colors.purple,
            }}
          >
            {greeting.charAt(0).toUpperCase()}
          </Text>
        </IconTile>
        <View>
          <Caption>Hello!</Caption>
          <BodyEmphasis>{greeting}</BodyEmphasis>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={10}>
        <IconTile tint="purpleWash" size={40} radius={20}>
          <Text style={{ fontSize: 14, lineHeight: 18 }}>🔔</Text>
        </IconTile>
      </Pressable>
    </View>
  );
}
