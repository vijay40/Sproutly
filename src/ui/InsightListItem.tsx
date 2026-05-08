import { View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { Body, Caption, Text } from './Text';
import { Card } from './Card';

type Category = 'TREND' | 'NUDGE' | 'WIN' | 'WATCH';
type State = 'applied' | 'dismissed' | 'open';

const CATEGORY_BG: Record<Category, string> = {
  TREND: colors.purpleWash,
  NUDGE: colors.gold,
  WIN: colors.sage,
  WATCH: colors.tilePeach,
};

const CATEGORY_INK: Record<Category, string> = {
  TREND: colors.purple,
  NUDGE: colors.goldInk,
  WIN: colors.sageInk,
  WATCH: '#7A3A14',
};

interface Props {
  category: Category;
  relativeTime: string;
  text: string;
  state?: State;
}

export function InsightListItem({ category, relativeTime, text, state = 'open' }: Props) {
  return (
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s }}>
          <View
            style={{
              backgroundColor: CATEGORY_BG[category],
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontFamily: 'LexendDeca-SemiBold',
                fontSize: 10,
                letterSpacing: 1.2,
                color: CATEGORY_INK[category],
              }}
            >
              {category}
            </Text>
          </View>
          <Caption>{relativeTime}</Caption>
        </View>
        {state !== 'open' && <StateChip state={state} />}
      </View>
      <Body color="ink">{text}</Body>
    </Card>
  );
}

function StateChip({ state }: { state: Exclude<State, 'open'> }) {
  const bg = state === 'applied' ? colors.sage : colors.gray100;
  const ink = state === 'applied' ? colors.sageInk : colors.muted;
  const label = state === 'applied' ? '✓ Applied' : 'Dismissed';
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ fontFamily: 'LexendDeca-SemiBold', fontSize: 11, color: ink }}>{label}</Text>
    </View>
  );
}
