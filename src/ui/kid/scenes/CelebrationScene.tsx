import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { FRAME_H, FRAME_W } from '../theme';

export function CelebrationScene({
  children,
  onComplete,
}: {
  /** Underlying scene rendered beneath the overlay. */
  children: React.ReactNode;
  onComplete?: () => void;
}) {
  const ref = useRef<LottieView>(null);

  useEffect(() => {
    ref.current?.play();
    const t = setTimeout(() => onComplete?.(), 2000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <View style={{ width: FRAME_W, height: FRAME_H }}>
      {children}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: FRAME_W,
          height: FRAME_H,
          backgroundColor: 'rgba(0,0,0,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LottieView
          ref={ref}
          source={require('../../../../assets/lottie/celebration.json')}
          autoPlay
          loop={false}
          style={{ width: 600, height: 600 }}
        />
      </View>
    </View>
  );
}
