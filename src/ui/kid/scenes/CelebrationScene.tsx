import { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';

/**
 * Confetti overlay shown for ~2s when a task is marked complete.
 * Renders over whatever scene is passed as children, filling the full window.
 */
export function CelebrationScene({
  children,
  onComplete,
}: {
  /** Underlying scene rendered beneath the overlay. */
  children: React.ReactNode;
  onComplete?: () => void;
}) {
  const ref = useRef<LottieView>(null);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    ref.current?.play();
    const t = setTimeout(() => onComplete?.(), 2000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <LottieView
          ref={ref}
          source={require('../../../../assets/lottie/confetti.lottie')}
          autoPlay
          loop={false}
          style={{ width, height }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}
