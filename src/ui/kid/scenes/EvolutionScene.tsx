import { useEffect, useRef, useState } from 'react';
import { Animated, View, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { KidBackgroundNight } from '../parts/KidBackground';
import { AvatarCircle } from '../parts/AvatarCircle';
import { stageEmoji } from '../theme';

export function EvolutionScene({
  from, to, onComplete,
}: {
  from: number;
  to: number;
  onComplete: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
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

  const fromEmoji = stageEmoji(from);
  const toEmoji = stageEmoji(to);

  const orbSize = landscape ? 300 : 360;
  const emojiSize = Math.round(orbSize * 0.611);

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
      <KidBackgroundNight />
      <AvatarCircle size={orbSize} shadow="hero">
        <View style={{ width: orbSize, height: orbSize, alignItems: 'center', justifyContent: 'center' }}>
          {!showTo && (
            <Animated.Text style={{ fontSize: emojiSize, lineHeight: Math.round(emojiSize * 1.18), textAlign: 'center' }}>
              {fromEmoji}
            </Animated.Text>
          )}
          {showTo && (
            <Animated.Text style={{ fontSize: emojiSize, lineHeight: Math.round(emojiSize * 1.18), textAlign: 'center', opacity: fade }}>
              {toEmoji}
            </Animated.Text>
          )}
        </View>
      </AvatarCircle>
      <LottieView
        ref={lottieRef}
        source={require('../../../../assets/lottie/evolution.json')}
        autoPlay
        loop={false}
        style={{ position: 'absolute', width: Math.min(width, height), height: Math.min(width, height) }}
      />
    </View>
  );
}
