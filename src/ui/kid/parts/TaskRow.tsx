import { View, Text } from 'react-native';
import type { TaskRow as TaskRowType, TaskCompletionRow } from '../../../types/db';
import { slotIconBg, kidInk, kidMuted } from '../theme';

const slotLabel: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

export function TaskRow({ task, completion }: { task: TaskRowType; completion: TaskCompletionRow | null }) {
  const complete = !!completion;
  const bg = slotIconBg[task.time_slot];

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        height: 108,
        borderRadius: 24,
        width: 600,
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
          left: 18,
          top: 18,
          width: 72,
          height: 72,
          borderRadius: 18,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 40, lineHeight: 48, textAlign: 'center' }}>{task.icon ?? '•'}</Text>
      </View>

      <Text
        style={{
          position: 'absolute',
          left: 108,
          top: 26,
          fontSize: 22,
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
          left: 108,
          top: 58,
          fontSize: 14,
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
            left: 520,
            top: 26,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#D4F4E5',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 28, color: '#2E9F6B', fontFamily: 'LexendDeca-Bold' }}>✓</Text>
        </View>
      ) : (
        <View
          style={{
            position: 'absolute',
            left: 520,
            top: 26,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#EDE8FF',
            borderWidth: 3,
            borderColor: '#EEE9FF',
          }}
        />
      )}
    </View>
  );
}
