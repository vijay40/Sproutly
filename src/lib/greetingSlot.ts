export type GreetingSlot = 'morning' | 'afternoon' | 'evening';

/**
 * Returns the greeting slot for `now` interpreted in `timezone`.
 * 05:00–10:59 morning · 11:00–16:59 afternoon · 17:00–21:59 evening · otherwise null.
 */
export function deriveGreetingSlot(now: Date, timezone: string): GreetingSlot | null {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).format(now),
  );
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return null;
}
