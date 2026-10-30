import { useCallback, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveStageAvatarAssetStage } from './stageAvatarAssetStage';
import { kidWhite } from '../theme';

const STAGE_IMAGES: Record<number, ImageSourcePropType> = {
  1: require('../../../../assets/unicorn/avatar/stage1.png'),
  2: require('../../../../assets/unicorn/avatar/stage2.png'),
  3: require('../../../../assets/unicorn/avatar/stage3.png'),
  4: require('../../../../assets/unicorn/avatar/stage4.png'),
  5: require('../../../../assets/unicorn/avatar/stage5.png'),
};

interface Props {
  stage: number;
  size: number;
  style?: StyleProp<ViewStyle>;
  /** When false, no tap-to-expand (default true). */
  previewable?: boolean;
}

function CircularStageImage({
  stage,
  size,
  style,
}: {
  stage: number;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  const key = resolveStageAvatarAssetStage(stage);
  const source = STAGE_IMAGES[key];
  const radius = size / 2;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }, style]}>
      <Image source={source} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

export function StageAvatarImage({ stage, size, style, previewable = true }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const open = useCallback(() => {
    if (previewable) setModalOpen(true);
  }, [previewable]);
  const close = useCallback(() => setModalOpen(false), []);

  const previewDiameter = Math.max(
    1,
    Math.round(
      Math.min(width - 32, height - insets.top - insets.bottom - 88, Math.min(width, height) * 0.88),
    ),
  );

  return (
    <>
      <Pressable
        onPress={open}
        disabled={!previewable}
        accessibilityRole="button"
        accessibilityLabel="View unicorn avatar"
        style={({ pressed }) => [previewable && pressed ? { opacity: 0.92 } : null]}
      >
        <CircularStageImage stage={stage} size={size} style={style} />
      </Pressable>

      <Modal
        visible={modalOpen}
        animationType="fade"
        transparent
        onRequestClose={close}
        {...(Platform.OS === 'ios' ? { presentationStyle: 'overFullScreen' as const } : {})}
      >
        <Pressable
          onPress={close}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 16,
          }}
        >
          <Pressable
            onPress={close}
            hitSlop={12}
            style={{
              position: 'absolute',
              top: insets.top + 8,
              right: 16,
              zIndex: 2,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
            }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={{ color: kidWhite, fontFamily: 'LexendDeca-SemiBold', fontSize: 16 }}>Done</Text>
          </Pressable>

          <View pointerEvents="none" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <CircularStageImage stage={stage} size={previewDiameter} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
