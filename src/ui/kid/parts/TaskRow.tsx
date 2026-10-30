import { View, Text, Pressable } from 'react-native';
import type { TaskRow as TaskRowType, TaskCompletionRow } from '../../../types/db';
import { slotIconBg, kidInk, kidMuted } from '../theme';

const slotLabel: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

export function TaskRow({
  task,
  completion,
  width = 600,
  onIncompletePress,
}: {
  task: TaskRowType;
  completion: TaskCompletionRow | null;
  width?: number;
  /** When set, tapping an incomplete row invokes this (kid view). */
  onIncompletePress?: (task: TaskRowType) => void;
}) {
  const complete = !!completion;
  const bg = slotIconBg[task.time_slot];
  const bonus = task.is_bonus;
  // Bonus rows get a warm gold tint + dashed gold border so the kid can tell
  // at a glance "this one's optional / extra".
  const cardBg = bonus ? '#FFF7E0' : '#FFFFFF';
  const borderColor = bonus ? '#F0B400' : 'transparent';

  const inner = (
    <View
      style={{
        backgroundColor: cardBg,
        height: 81,
        borderRadius: 18,
        width,
        borderWidth: bonus ? 2 : 0,
        borderStyle: bonus ? 'dashed' : 'solid',
        borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 28,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 14,
          top: 14,
          width: 54,
          height: 54,
          borderRadius: 14,
          backgroundColor: bonus ? '#FFE6A1' : bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 30, lineHeight: 36, textAlign: 'center' }}>{task.icon ?? '•'}</Text>
      </View>

      <Text
        numberOfLines={1}
        style={{
          position: 'absolute',
          left: 81,
          top: bonus ? 14 : 20,
          right: 72,
          fontSize: 17,
          fontFamily: 'LexendDeca-SemiBold',
          color: complete ? kidMuted : kidInk,
          textDecorationLine: complete ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </Text>
      {bonus ? (
        <View
          style={{
            position: 'absolute',
            left: 81,
            top: 42,
            paddingVertical: 2,
            paddingHorizontal: 8,
            borderRadius: 10,
            backgroundColor: '#F0B400',
            alignSelf: 'flex-start',
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontFamily: 'LexendDeca-Bold',
              letterSpacing: 0.5,
              color: '#3A2A00',
            }}
          >
            ⭐ BONUS
          </Text>
        </View>
      ) : (
        <Text
          style={{
            position: 'absolute',
            left: 81,
            top: 44,
            fontSize: 11,
            fontFamily: 'LexendDeca-Regular',
            color: kidMuted,
          }}
        >
          {slotLabel[task.time_slot] ?? task.time_slot}
        </Text>
      )}

      {complete ? (
        <View
          style={{
            position: 'absolute',
            right: 20,
            top: 20,
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#D4F4E5',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 21, color: '#2E9F6B', fontFamily: 'LexendDeca-Bold' }}>✓</Text>
        </View>
      ) : (
        <View
          style={{
            position: 'absolute',
            right: 20,
            top: 20,
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#EDE8FF',
            borderWidth: 2,
            borderColor: '#EEE9FF',
          }}
        />
      )}
    </View>
  );

  if (!complete && onIncompletePress) {
    return (
      <Pressable
        onPress={() => onIncompletePress(task)}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${task.title} complete`}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}
