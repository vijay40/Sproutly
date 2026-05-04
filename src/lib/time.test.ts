import { describe, expect, it } from 'vitest';
import { todayLocalDate, toLocalDate } from './time';

describe('time helpers', () => {
  it('todayLocalDate formats as YYYY-MM-DD in the given tz', () => {
    const instant = new Date('2026-05-04T23:30:00Z'); // Kolkata = 2026-05-05
    expect(todayLocalDate('UTC', instant)).toBe('2026-05-04');
    expect(todayLocalDate('Asia/Kolkata', instant)).toBe('2026-05-05');
  });

  it('toLocalDate is a thin wrapper around todayLocalDate', () => {
    const instant = new Date('2026-05-04T23:30:00Z');
    expect(toLocalDate(instant, 'UTC')).toBe('2026-05-04');
  });
});
