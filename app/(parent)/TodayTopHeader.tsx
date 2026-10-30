import { Pressable, Text as RNText, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/theme/tokens';
import { BodyEmphasis, Caption, IconTile, Text } from '../../src/ui';
import { tapLight } from '../../src/lib/haptics';
import { enterKidView } from '../../src/lib/mode';

interface Props {
  greeting: string;
}

export function TodayTopHeader({ greeting }: Props) {
  const router = useRouter();

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={() => {
            tapLight();
            void (async () => {
              await enterKidView();
              router.push('/(kid)/display');
            })();
          }}
          accessibilityRole="button"
          accessibilityLabel="Kid view"
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            height: 40,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: pressed ? '#E9DFFF' : '#F3EEFF',
            borderWidth: 1,
            borderColor: '#E4DAFF',
            gap: 6,
          })}
        >
          <RNText style={{ fontSize: 16 }}>👁</RNText>
          <Text
            style={{
              fontFamily: 'LexendDeca-SemiBold',
              fontSize: 13,
              lineHeight: 16,
              color: colors.purple,
            }}
          >
            Kid view
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={10}>
          <IconTile tint="purpleWash" size={40} radius={20}>
            <Text style={{ fontSize: 14, lineHeight: 18 }}>🔔</Text>
          </IconTile>
        </Pressable>
      </View>
    </View>
  );
}
