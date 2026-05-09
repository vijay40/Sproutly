import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { BackgroundBlobs } from '../parts/BackgroundBlobs';
import { AvatarOrb } from '../parts/AvatarOrb';
import { CodeEntry } from '../../CodeEntry';
import { FRAME_H, FRAME_W, kidInk, kidMuted, kidPurple, kidPurpleWash, kidWhite, slotGradients } from '../theme';

export function PrePairScene({
  code,
  onChangeCode,
  onSubmit,
  loading,
}: {
  code: string;
  onChangeCode: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const dotOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dotOpacity]);

  return (
    <View
      style={{
        width: FRAME_W,
        height: FRAME_H,
        backgroundColor: slotGradients.default.from,
        borderRadius: 40,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <BackgroundBlobs />

      {/* Left column */}
      <Text style={{ position: 'absolute', left: 64, top: 120, fontSize: 44, color: kidMuted, fontFamily: 'LexendDeca-SemiBold' }}>
        Hi there! 👋
      </Text>
      <Text style={{ position: 'absolute', left: 64, top: 180, fontSize: 52, lineHeight: 60, color: kidInk, fontFamily: 'LexendDeca-Bold' }}>
        Ask a grown-up{'\n'}to pair this iPad
      </Text>

      <View style={{ position: 'absolute', left: 64, top: 340 }}>
        <CodeEntry value={code} onChange={onChangeCode} onSubmit={onSubmit} />
      </View>

      <Text style={{ position: 'absolute', left: 64, top: 452, fontSize: 18, color: kidMuted, fontFamily: 'LexendDeca-Regular' }}>
        They&rsquo;ll find the code in Settings on their phone.
      </Text>

      <View
        style={{
          position: 'absolute',
          left: 64,
          top: 560,
          backgroundColor: kidWhite,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.06,
          shadowRadius: 28,
        }}
      >
        <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: kidPurple, opacity: dotOpacity }} />
        <Text style={{ color: kidInk, fontSize: 16, fontFamily: 'LexendDeca-Medium' }}>
          {loading ? 'Pairing…' : 'Waiting for a grown-up…'}
        </Text>
      </View>

      {/* Right column */}
      <View style={{ position: 'absolute', left: 706, top: 200 }}>
        <AvatarOrb emoji="🥚" />
      </View>
      <View
        style={{
          position: 'absolute',
          left: 845,
          top: 652,
          backgroundColor: kidPurpleWash,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 22,
        }}
      >
        <Text style={{ color: kidPurple, fontSize: 14, fontFamily: 'LexendDeca-SemiBold' }}>Not paired yet</Text>
      </View>
    </View>
  );
}
