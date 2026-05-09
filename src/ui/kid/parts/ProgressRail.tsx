import { View, Text } from 'react-native';
import { kidWhite } from '../theme';

export function ProgressRail({ done, total }: { done: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  const fillFraction = Math.min(done / safeTotal, 1);
  const RAIL_W = 600;

  return (
    <View
      style={{
        backgroundColor: kidWhite,
        height: 56,
        borderRadius: 28,
        width: RAIL_W,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 28,
        overflow: 'hidden',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: RAIL_W * fillFraction,
          borderRadius: 28,
          // RN doesn't support linear-gradient without a lib; approximate with the start color.
          backgroundColor: '#6B40E0',
        }}
      />
      <Text
        style={{
          textAlign: 'center',
          color: kidWhite,
          fontFamily: 'LexendDeca-Bold',
          fontSize: 18,
        }}
      >
        {done} of {total} done today
      </Text>
    </View>
  );
}
