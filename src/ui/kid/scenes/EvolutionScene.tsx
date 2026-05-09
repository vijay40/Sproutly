import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import type { ChildRow } from '../../../types/db';
import { BackgroundBlobs } from '../parts/BackgroundBlobs';
import { FRAME_H, FRAME_W, kidWhite, orb, slotGradients } from '../theme';

const STAGE_EMOJI = ['🥚', '🐣', '🐴', '✨', '🦄', '🌟'];

export function EvolutionScene({
  from, to, child, onComplete,
}: {
  from: number;
  to: number;
  child: ChildRow;
  onComplete: () => void;
}) {
  const lottieRef = useRef<LottieView>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const [showTo, setShowTo] = useState(false);

  useEffect(() => {
    lottieRef.current?.play();
    const crossfadeAt = setTimeout(() => {
      setShowTo(true);
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 1800);
    const finish = setTimeout(onComplete, 4000);
    return () => { clearTimeout(crossfadeAt); clearTimeout(finish); };
  }, [fade, onComplete]);

  const fromEmoji = STAGE_EMOJI[from] ?? '🦄';
  const toEmoji = child.avatar_emoji ?? STAGE_EMOJI[to] ?? '🦄';

  return (
    <View
      style={{
        width: FRAME_W,
        height: FRAME_H,
        backgroundColor: slotGradients.default.to,
        borderRadius: 40,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <BackgroundBlobs />
      <View
        style={{
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          backgroundColor: kidWhite,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {!showTo && (
          <Text style={{ fontSize: 220, textAlign: 'center' }}>{fromEmoji}</Text>
        )}
        {showTo && (
          <Animated.Text style={{ fontSize: 220, textAlign: 'center', opacity: fade }}>
            {toEmoji}
          </Animated.Text>
        )}
      </View>
      <LottieView
        ref={lottieRef}
        source={require('../../../../assets/lottie/evolution.json')}
        autoPlay
        loop={false}
        style={{ position: 'absolute', width: 800, height: 800 }}
      />
    </View>
  );
}
