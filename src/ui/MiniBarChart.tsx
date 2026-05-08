import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors, spacing } from '../theme/tokens';
import { Caption } from './Text';

interface Props {
  values: number[];
  highlightIndex?: number;
  labels?: string[];
  height?: number;
  max?: number;
}

const DEFAULT_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MiniBarChart({ values, highlightIndex, labels = DEFAULT_LABELS, height = 100, max }: Props) {
  const topCap = max ?? Math.max(1, ...values);
  const width = 280;
  const barWidth = 24;
  const gap = (width - barWidth * values.length) / (values.length - 1);

  return (
    <View>
      <Svg width={width} height={height}>
        {values.map((v, i) => {
          const h = Math.max(4, (v / topCap) * (height - 4));
          const x = i * (barWidth + gap);
          const y = height - h;
          const fill = i === highlightIndex ? colors.purple : colors.purpleWash;
          return <Rect key={i} x={x} y={y} width={barWidth} height={h} rx={6} fill={fill} />;
        })}
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width,
          marginTop: spacing.xs,
        }}
      >
        {labels.map((l, i) => (
          <Caption
            key={i}
            style={{
              width: barWidth,
              textAlign: 'center',
              color: i === highlightIndex ? colors.purple : colors.muted,
            }}
          >
            {l}
          </Caption>
        ))}
      </View>
    </View>
  );
}
