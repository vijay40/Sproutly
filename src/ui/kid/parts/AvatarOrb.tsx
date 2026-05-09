import { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { kidWhite, orb } from '../theme';

export function AvatarOrb({ emoji, aura = null }: { emoji: string; aura?: 'pulse' | null }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (aura !== 'pulse') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,  duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [aura, scale]);

  return (
    <Animated.View
      style={{
        width: orb.size,
        height: orb.size,
        borderRadius: orb.size / 2,
        backgroundColor: kidWhite,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: orb.shadow.offsetY },
        shadowOpacity: 0.06,
        shadowRadius: orb.shadow.radius,
        overflow: 'hidden',
      }}
    >
      <Text style={{ fontSize: 220, lineHeight: 260, textAlign: 'center' }}>{emoji}</Text>
    </Animated.View>
  );
}
