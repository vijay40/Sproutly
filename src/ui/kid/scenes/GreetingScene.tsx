import { View, Text } from 'react-native';
import type { ChildRow } from '../../../types/db';
import type { GreetingSlot } from '../../../domain/kidScreenState';
import { BackgroundBlobs } from '../parts/BackgroundBlobs';
import { AvatarOrb } from '../parts/AvatarOrb';
import { FRAME_H, FRAME_W, kidInk, slotGradients } from '../theme';

const HEADER: Record<GreetingSlot, string> = {
  morning:   'Good morning',
  afternoon: 'Welcome back',
  evening:   'Good evening',
};

export function GreetingScene({ slot, child }: { slot: GreetingSlot; child: ChildRow }) {
  const g = slotGradients[slot];
  return (
    <View
      style={{
        width: FRAME_W,
        height: FRAME_H,
        backgroundColor: g.from,
        borderRadius: 40,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <BackgroundBlobs />
      <AvatarOrb emoji={child.avatar_emoji ?? '🦄'} />
      <Text
        style={{
          fontSize: 48,
          fontFamily: 'LexendDeca-Bold',
          color: kidInk,
          marginTop: 32,
        }}
      >
        {HEADER[slot]}, {child.name}
      </Text>
    </View>
  );
}
