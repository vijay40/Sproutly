import { View, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { kidPurple, kidWhite } from '../theme';

/**
 * Progress rail matching Figma ProgressRail (id 173:28).
 *
 *   container: white, 600×56, radius 28, shadow 0 8 28 rgba(0,0,0,0.06)
 *   fill:      linear-gradient(90deg, #5E33E0, #D64A9E), radius 28
 *   label:     Lexend Deca Bold 20pt, purple on white background,
 *              white on gradient fill — two labels stacked, the white one
 *              clipped to the fill width so the color flips automatically.
 */
export function ProgressRail({
  done,
  total,
  width = 600,
  compact = false,
}: {
  done: number;
  total: number;
  width?: number;
  compact?: boolean;
}) {
  const safeTotal = Math.max(total, 1);
  const fillFraction = Math.min(Math.max(done / safeTotal, 0), 1);
  const fillWidth = width * fillFraction;
  const height = compact ? 44 : 56;
  const radius = compact ? 22 : 28;
  const labelText = `${done} of ${total} done today`;

  const labelStyle = {
    textAlign: 'center' as const,
    fontFamily: 'LexendDeca-Bold',
    fontSize: compact ? 15 : 20,
    lineHeight: compact ? 20 : 28,
    width,
  };

  return (
    <View
      style={{
        backgroundColor: kidWhite,
        width,
        height,
        borderRadius: radius,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 28,
        overflow: 'hidden',
        justifyContent: 'center',
      }}
    >
      {/* Purple label (visible where there's no gradient fill) */}
      <Text style={[labelStyle, { color: kidPurple, position: 'absolute', left: 0, right: 0 }]}>
        {labelText}
      </Text>

      {fillWidth > 0 && (
        <>
          <Svg width={fillWidth} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Defs>
              <LinearGradient id="progress" x1="0" y1="0" x2={fillWidth} y2="0" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#5E33E0" />
                <Stop offset="1" stopColor="#D64A9E" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={fillWidth} height={height} rx={radius} ry={radius} fill="url(#progress)" />
          </Svg>

          {/* White label clipped to fill width — overlays the purple label */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: fillWidth,
              height,
              overflow: 'hidden',
              justifyContent: 'center',
            }}
          >
            <Text style={[labelStyle, { color: kidWhite }]}>{labelText}</Text>
          </View>
        </>
      )}
    </View>
  );
}
