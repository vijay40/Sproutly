import { ReactNode } from 'react';
import { Modal, Pressable, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  contentStyle?: ViewStyle;
  maxHeight?: number;
}

export function BottomSheet({ visible, onClose, children, contentStyle, maxHeight }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(36, 37, 44, 0.15)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={[
            {
              backgroundColor: colors.white,
              borderTopLeftRadius: radii.screen,
              borderTopRightRadius: radii.screen,
              paddingTop: spacing.m,
              paddingBottom: insets.bottom + spacing.wide,
              paddingHorizontal: spacing.wide,
              maxHeight: maxHeight !== undefined ? maxHeight + insets.bottom : undefined,
            },
            contentStyle,
          ]}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.gray100,
              alignSelf: 'center',
              marginBottom: spacing.md,
            }}
          />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
