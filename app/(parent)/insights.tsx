import { useState } from 'react';
import { View } from 'react-native';
import { tapLight } from '../../src/lib/haptics';
import { MOCK_INSIGHTS } from '../../src/lib/mockInsights';
import {
  BodyEmphasis,
  Caption,
  Card,
  Display,
  InsightCard,
  InsightListItem,
  MiniBarChart,
  Screen,
  SectionHeader,
  StatChip,
  TextButton,
} from '../../src/ui';
import { spacing } from '../../src/theme/tokens';

export default function InsightsScreen() {
  const [heroDismissed, setHeroDismissed] = useState(false);
  const m = MOCK_INSIGHTS;

  return (
    <Screen bottomGutter={88}>
      <Display>Insights</Display>
      <Caption style={{ marginTop: 4, marginBottom: spacing.lg }}>
        Powered by Claude · updated {m.lastUpdatedHoursAgo}h ago
      </Caption>

      <View style={{ flexDirection: 'row', gap: spacing.s, marginBottom: spacing.lg }}>
        <StatChip value={String(m.streakDays)} label="Day streak" variant="lavender" />
        <StatChip value={`${m.weekCompletionPct}%`} label="This week" variant="sage" />
        <StatChip value={`+${m.vsLastPct}%`} label="vs last" variant="gold" />
      </View>

      {!heroDismissed && (
        <InsightCard
          text={m.hero.text}
          chipLabel={m.hero.chipLabel}
          onApply={() => { tapLight(); setHeroDismissed(true); }}
          onDismiss={() => { tapLight(); setHeroDismissed(true); }}
        />
      )}

      <Card>
        <BodyEmphasis>This week</BodyEmphasis>
        <Caption style={{ marginTop: 2, marginBottom: spacing.md }}>
          {m.weeklyValues.reduce((a, b) => a + b, 0)} of {m.weeklyValues.length * 5} tasks this week
        </Caption>
        <MiniBarChart values={m.weeklyValues} highlightIndex={m.weeklyHighlightIndex} />
      </Card>

      <SectionHeader
        title="Recent insights"
        trailing={<TextButton title="View all" color="purple" onPress={() => undefined} />}
      />

      {m.recent.map((r) => (
        <InsightListItem
          key={r.id}
          category={r.category}
          relativeTime={r.relativeTime}
          text={r.text}
          state={r.state}
        />
      ))}
    </Screen>
  );
}
