import { Pressable, Text as RNText, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { BodyEmphasis } from './Text';
import { BottomSheet } from './BottomSheet';
import { tapLight } from '../lib/haptics';

const AVATAR_EMOJI = [
  '🦄', '🐻', '🐱', '🦊', '🐼',
  '🐸', '🐵', '🐯', '🐨', '🐰',
  '🐶', '🦁', '🦒', '🐙', '🐳',
  '🐧', '🐢', '🐞', '🐝', '🦋',
];

const TASK_EMOJI = [
  '🪥', '🛁', '🧼', '🚿', '🧴',
  '📚', '📖', '✏️', '🎒', '🧮',
  '🧹', '🧺', '🛏️', '🍽️', '🥣',
  '🏃', '⚽', '🎨', '🎵', '🌱',
];

type Kind = 'avatar' | 'task';

interface Props {
  visible: boolean;
  value: string | null;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** Which emoji set + title to show. Defaults to 'avatar' for backwards-compat. */
  kind?: Kind;
}

export function EmojiPickerSheet({ visible, value, onSelect, onClose, kind = 'avatar' }: Props) {
  const emoji = kind === 'task' ? TASK_EMOJI : AVATAR_EMOJI;
  const title = kind === 'task' ? 'Choose icon' : 'Choose avatar';
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={420}>
      <BodyEmphasis style={{ textAlign: 'center', marginBottom: spacing.md }}>
        {title}
      </BodyEmphasis>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 14,
          justifyContent: 'center',
        }}
      >
        {emoji.map((e) => {
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
              accessibilityLabel={`${kind === 'task' ? 'Task icon' : 'Avatar'} ${e}`}
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
