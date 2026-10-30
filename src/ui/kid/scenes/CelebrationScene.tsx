import { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';

/**
 * Full-screen Lottie overlay shown for ~2s when a task is marked complete.
 * This component renders ONLY the overlay — it does not wrap the underlying
 * scene. The caller is expected to render the scene as a sibling and place
 * `<CelebrationScene />` on top so the scene stays continuously mounted
 * (which preserves refs / animation state across celebration toggles).
 *
 * When `allDone` is true, plays the day-complete celebration instead of the
 * single-task confetti.
 */
export function CelebrationScene({
  onComplete,
  allDone = false,
}: {
  onComplete?: () => void;
  allDone?: boolean;
}) {
  const ref = useRef<LottieView>(null);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    ref.current?.play();
    const t = setTimeout(() => onComplete?.(), 2000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}
    >
      <LottieView
        ref={ref}
        source={
          allDone
            ? require('../../../../assets/lottie/all_done_celebration.lottie')
            : require('../../../../assets/lottie/confetti.lottie')
        }
        autoPlay
        loop={false}
        style={{ width, height }}
        resizeMode="cover"
      />
    </View>
  );
}
