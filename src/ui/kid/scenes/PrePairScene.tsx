import { useEffect, useRef } from 'react';
import { Animated, Text, View, useWindowDimensions } from 'react-native';
import { BackgroundBlobs } from '../parts/BackgroundBlobs';
import { AvatarOrb } from '../parts/AvatarOrb';
import { CodeEntry } from '../../CodeEntry';
import { kidInk, kidMuted, kidPurple, kidPurpleWash, kidWhite, slotGradients } from '../theme';

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
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
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
        flex: 1,
        backgroundColor: slotGradients.default.from,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <BackgroundBlobs />

      <View
        style={{
          flex: 1,
          flexDirection: landscape ? 'row' : 'column',
          paddingHorizontal: 40,
          paddingVertical: 40,
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', gap: 24, maxWidth: landscape ? undefined : 520 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: landscape ? 40 : 32, color: kidMuted, fontFamily: 'LexendDeca-SemiBold' }}>
              Hi there! 👋
            </Text>
            <Text
              style={{
                fontSize: landscape ? 48 : 36,
                lineHeight: landscape ? 56 : 44,
                color: kidInk,
                fontFamily: 'LexendDeca-Bold',
              }}
            >
              Ask a grown-up{'\n'}to pair this iPad
            </Text>
          </View>

          <CodeEntry value={code} onChange={onChangeCode} onSubmit={onSubmit} />

          <Text style={{ fontSize: 16, color: kidMuted, fontFamily: 'LexendDeca-Regular' }}>
            They&rsquo;ll find the code in Settings on their phone.
          </Text>

          <View
            style={{
              alignSelf: 'flex-start',
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
        </View>

        <View style={{ alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 24 }}>
          <AvatarOrb emoji="🥚" />
          <View
            style={{
              backgroundColor: kidPurpleWash,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 22,
            }}
          >
            <Text style={{ color: kidPurple, fontSize: 14, fontFamily: 'LexendDeca-SemiBold' }}>Not paired yet</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
