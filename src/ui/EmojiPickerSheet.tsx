import { Pressable, Text as RNText, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { BodyEmphasis } from './Text';
import { BottomSheet } from './BottomSheet';
import { tapLight } from '../lib/haptics';

const EMOJI = [
  '🦄', '🐻', '🐱', '🦊', '🐼',
  '🐸', '🐵', '🐯', '🐨', '🐰',
  '🐶', '🦁', '🦒', '🐙', '🐳',
  '🐧', '🐢', '🐞', '🐝', '🦋',
];

interface Props {
  visible: boolean;
  value: string | null;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPickerSheet({ visible, value, onSelect, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={420}>
      <BodyEmphasis style={{ textAlign: 'center', marginBottom: spacing.md }}>
        Choose avatar
      </BodyEmphasis>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 14,
          justifyContent: 'center',
        }}
      >
        {EMOJI.map((e) => {
          const active = e === value;
          return (
            <Pressable
              key={e}
              onPress={() => {
                tapLight();
                onSelect(e);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Avatar ${e}`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.purpleWash,
                borderWidth: active ? 2 : 0,
                borderColor: active ? colors.purple : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <RNText style={{ fontSize: 28, lineHeight: 34 }}>{e}</RNText>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
