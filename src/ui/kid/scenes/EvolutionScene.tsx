import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { KidBackgroundNight } from '../parts/KidBackground';
import { AvatarCircle } from '../parts/AvatarCircle';
import { stageEmoji } from '../theme';

const TRANSITION_VIDEOS: Partial<Record<string, ReturnType<typeof require>>> = {
  '1-2': require('../../../../assets/unicorn/transformation/stage1_stage2.mp4'),
  '2-3': require('../../../../assets/unicorn/transformation/stage2_stage3.mp4'),
  '3-4': require('../../../../assets/unicorn/transformation/stage3_stage4.mp4'),
  '4-5': require('../../../../assets/unicorn/transformation/stage4_stage5.mp4'),
};

export function EvolutionScene({
  from,
  to,
  onComplete,
}: {
  from: number;
  to: number;
  onComplete: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const videoSource = TRANSITION_VIDEOS[`${from}-${to}`];

  if (videoSource) {
    return <VideoEvolution source={videoSource} onComplete={onComplete} />;
  }

  return (
    <LottieEvolution
      from={from}
      to={to}
      width={width}
      height={height}
      onComplete={onComplete}
    />
  );
}

function VideoEvolution({
  source,
  onComplete,
}: {
  source: ReturnType<typeof require>;
  onComplete: () => void;
}) {
  const videoRef = useRef<Video>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  }, []);

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      void ScreenOrientation.unlockAsync();
    };
  }, []);

  const startPlayback = useCallback(async () => {
    const ref = videoRef.current;
    if (!ref) return;
    try {
      await ref.setPositionAsync(0);
      await ref.playAsync();
    } catch {
      onCompleteRef.current();
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0C18' }}>
      <Video
        ref={videoRef}
        source={source}
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        volume={1.0}
        onLoad={() => {
          void startPlayback();
        }}
        onPlaybackStatusUpdate={(status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) onCompleteRef.current();
        }}
        onError={() => {
          onCompleteRef.current();
        }}
      />
    </View>
  );
}

function LottieEvolution({
  from,
  to,
  width,
  height,
  onComplete,
}: {
  from: number;
  to: number;
  width: number;
  height: number;
  onComplete: () => void;
}) {
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
    return () => {
      clearTimeout(crossfadeAt);
      clearTimeout(finish);
    };
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
            <Animated.Text
              style={{ fontSize: emojiSize, lineHeight: Math.round(emojiSize * 1.18), textAlign: 'center' }}
            >
              {fromEmoji}
            </Animated.Text>
          )}
          {showTo && (
            <Animated.Text
              style={{ fontSize: emojiSize, lineHeight: Math.round(emojiSize * 1.18), textAlign: 'center', opacity: fade }}
            >
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
