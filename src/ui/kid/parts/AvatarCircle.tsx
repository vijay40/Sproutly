import { useEffect, useRef } from 'react';
import { Animated, Text, Platform } from 'react-native';
import { kidWhite } from '../theme';

/**
 * The white circular avatar container used on every K-scene that shows the
 * child's emoji (K2, K3, K4, K5, K6, K7). CSS copied from Figma:
 *
 *   background:   #FFFFFF
 *   border-radius: 50%
 *   shadow:       0 8px 28px rgba(0,0,0,0.06)   (default)
 *                 0 20px 60px rgba(0,0,0,0.18)  (hero, e.g. K6 centered orb)
 *
 * Emoji font-size defaults to 52% of the circle size (Figma ratio for K2 220/420,
 * K3/K4/K7 160/300). Caller can override via `emojiScale`.
 */

type Shadow = 'default' | 'hero';

interface Props {
  /** Emoji rendered inside the circle. Ignored when `children` is provided. */
  emoji?: string;
  size: number;
  aura?: 'pulse' | null;
  shadow?: Shadow;
  emojiScale?: number;
  /** Custom content to render in place of the default emoji (e.g. animated crossfade). */
  children?: React.ReactNode;
}

function shadowStyle(s: Shadow) {
  if (s === 'hero') {
    return Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 60 },
      android: { elevation: 14 },
      default: {},
    });
  }
  return Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 28 },
    android: { elevation: 4 },
    default: {},
  });
}

export function AvatarCircle({ emoji, size, aura = null, shadow = 'default', emojiScale = 0.52, children }: Props) {
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

  const emojiSize = Math.round(size * emojiScale);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: kidWhite,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
        overflow: 'hidden',
        ...shadowStyle(shadow),
      }}
    >
      {children ?? (
        <Text style={{ fontSize: emojiSize, lineHeight: Math.round(emojiSize * 1.18), textAlign: 'center' }}>
          {emoji}
        </Text>
      )}
    </Animated.View>
  );
}
