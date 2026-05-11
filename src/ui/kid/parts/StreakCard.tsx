import { View, Text } from 'react-native';
import { kidMuted, kidPurple, kidWhite } from '../theme';

/**
 * Streak card matching Figma StreakCard (id 170:6).
 *
 *   container: white 420×72, radius 24, shadow 0 8 28 rgba(0,0,0,0.06)
 *   paddingX 24, SPACE_BETWEEN with centered items
 *   left cluster:  [streak number 28pt Bold purple] [day streak 16pt SemiBold muted]
 *   right cluster: [Next stage in N 16pt SemiBold muted] [5 dots 10px, gap 4]
 */
const DOTS = 5;

export function StreakCard({
  streak,
  nextIn,
  width = 420,
  compact = false,
}: {
  streak: number;
  nextIn: number;
  width?: number;
  compact?: boolean;
}) {
  const filled = Math.max(0, Math.min(DOTS - Math.min(nextIn, DOTS), DOTS));
  const height = compact ? 48 : 56;
  const paddingH = compact ? 16 : 24;
  const radius = compact ? 20 : 24;
  const numSize = compact ? 20 : 28;
  const numLine = compact ? 26 : 36;
  const textSize = compact ? 12 : 16;
  const textLine = compact ? 16 : 22;
  const dotSize = compact ? 8 : 10;
  const dotGap = compact ? 4 : 6;
  const rightGap = compact ? 10 : 16;

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: kidWhite,
        borderRadius: radius,
        paddingHorizontal: paddingH,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 28,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontFamily: 'LexendDeca-Bold', fontSize: numSize, lineHeight: numLine, color: kidPurple }}>
          {streak}
        </Text>
        <Text style={{ fontFamily: 'LexendDeca-SemiBold', fontSize: textSize, lineHeight: textLine, color: kidMuted }}>
          day streak
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: rightGap }}>
        <Text style={{ fontFamily: 'LexendDeca-SemiBold', fontSize: textSize, lineHeight: textLine, color: kidMuted }}>
          {compact ? `Next in ${nextIn}` : `Next stage in ${nextIn}`}
        </Text>
        <View style={{ flexDirection: 'row', gap: dotGap }}>
          {Array.from({ length: DOTS }, (_, i) => (
            <View
              key={i}
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: i < filled ? kidPurple : '#D7CFF0',
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
