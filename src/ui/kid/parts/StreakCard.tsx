import { View, Text } from 'react-native';
import { kidMuted, kidPurple, kidWhite } from '../theme';

export function StreakCard({ streak, nextIn }: { streak: number; nextIn: number }) {
  const DOTS = 5;
  const filled = Math.max(0, Math.min(DOTS - Math.min(nextIn, DOTS), DOTS));

  return (
    <View
      style={{
        backgroundColor: kidWhite,
        height: 72,
        width: 420,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 28,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Text
        style={{
          position: 'absolute',
          left: 24,
          top: 20,
          fontSize: 28,
          fontFamily: 'LexendDeca-Bold',
          color: kidPurple,
        }}
      >
        {streak}
      </Text>
      <Text
        style={{
          position: 'absolute',
          left: 68,
          top: 28,
          fontSize: 14,
          fontFamily: 'LexendDeca-SemiBold',
          color: kidMuted,
        }}
      >
        day streak
      </Text>
      <Text
        style={{
          position: 'absolute',
          left: 240,
          top: 28,
          fontSize: 14,
          fontFamily: 'LexendDeca-SemiBold',
          color: kidMuted,
        }}
      >
        Next stage in {nextIn}
      </Text>
      <View style={{ position: 'absolute', left: 360, top: 30, flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: DOTS }, (_, i) => (
          <View
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: i < filled ? kidPurple : '#D7CFF0',
            }}
          />
        ))}
      </View>
    </View>
  );
}
