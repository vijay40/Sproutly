import { View, Text } from 'react-native';
import type { TaskRow as TaskRowType, TaskCompletionRow } from '../../../types/db';
import { slotIconBg, kidInk, kidMuted } from '../theme';

const slotLabel: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

export function TaskRow({
  task,
  completion,
  width = 600,
}: {
  task: TaskRowType;
  completion: TaskCompletionRow | null;
  width?: number;
}) {
  const complete = !!completion;
  const bg = slotIconBg[task.time_slot];

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        height: 81,
        borderRadius: 18,
        width,
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
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 30, lineHeight: 36, textAlign: 'center' }}>{task.icon ?? '•'}</Text>
      </View>

      <Text
        style={{
          position: 'absolute',
          left: 81,
          top: 20,
          fontSize: 17,
          fontFamily: 'LexendDeca-SemiBold',
          color: complete ? kidMuted : kidInk,
          textDecorationLine: complete ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </Text>
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
}
