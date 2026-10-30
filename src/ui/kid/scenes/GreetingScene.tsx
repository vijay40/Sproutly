import { View, Text, useWindowDimensions } from 'react-native';
import type { ChildRow } from '../../../types/db';
import { KidBackgroundPurple } from '../parts/KidBackground';
import { AvatarCircle } from '../parts/AvatarCircle';
import { stageFromSuccessfulDays } from '../../../domain/stageFromSuccessfulDays';
import { kidInk, kidMuted, stageEmoji } from '../theme';

export function GreetingScene({ child }: { child: ChildRow }) {
  const stage = stageFromSuccessfulDays(child.successful_days);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const small = width < 600;

  const orbSize = small ? 200 : landscape ? 300 : 350;
  const titleSize = small ? 32 : landscape ? 46 : 36;
  const titleLine = small ? 40 : landscape ? 50 : 40;
  const subSize = small ? 16 : 24;
  const subLine = small ? 22 : 32;
  const subTopGap = small ? 8 : 16;
  const titleTopGap = small ? 24 : 40;

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <KidBackgroundPurple />
      <AvatarCircle emoji={stageEmoji(stage)} size={orbSize} />
      <Text
        style={{
          fontSize: titleSize,
          lineHeight: titleLine,
          fontFamily: 'LexendDeca-Bold',
          color: kidInk,
          marginTop: titleTopGap,
          textAlign: 'center',
        }}
      >
        {small ? 'Welcome back,' : `Welcome back, ${child.name}`}
      </Text>
      {small ? (
        <Text
          style={{
            fontSize: 28,
            lineHeight: 36,
            fontFamily: 'LexendDeca-Bold',
            color: kidInk,
            textAlign: 'center',
          }}
        >
          {child.name}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: subSize,
          lineHeight: subLine,
          fontFamily: 'LexendDeca-Medium',
          color: kidMuted,
          marginTop: subTopGap,
          textAlign: 'center',
        }}
      >
        Let&rsquo;s have a great day!
      </Text>
    </View>
  );
}
