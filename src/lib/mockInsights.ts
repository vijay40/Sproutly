export interface MockInsightsData {
  lastUpdatedHoursAgo: number;
  streakDays: number;
  weekCompletionPct: number;
  vsLastPct: number;
  weeklyValues: number[];
  weeklyHighlightIndex: number;
  hero: {
    text: string;
    chipLabel: string;
  };
  recent: Array<{
    id: string;
    category: 'TREND' | 'NUDGE' | 'WIN' | 'WATCH';
    relativeTime: string;
    text: string;
    state: 'applied' | 'dismissed' | 'open';
  }>;
}

export const MOCK_INSIGHTS: MockInsightsData = {
  lastUpdatedHoursAgo: 6,
  streakDays: 7,
  weekCompletionPct: 82,
  vsLastPct: 12,
  weeklyValues: [3, 4, 5, 4, 5, 2, 3],
  weeklyHighlightIndex: 4,
  hero: {
    text: 'Aanya does better when mornings start calm.',
    chipLabel: 'NEW · TODAY',
  },
  recent: [
    {
      id: 'r1',
      category: 'TREND',
      relativeTime: '2 days ago',
      text: 'Bath time slips after 8 PM — try earlier.',
      state: 'applied',
    },
    {
      id: 'r2',
      category: 'NUDGE',
      relativeTime: '5 days ago',
      text: 'Skipped brushing teeth 3 days this week.',
      state: 'dismissed',
    },
  ],
};
