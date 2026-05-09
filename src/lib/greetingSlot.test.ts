import { describe, it, expect } from 'vitest';
import { deriveGreetingSlot } from './greetingSlot';

describe('deriveGreetingSlot', () => {
  it('returns morning at 06:00 NY', () => {
    // 2026-05-09 06:00 America/New_York = 10:00 UTC
    expect(deriveGreetingSlot(new Date('2026-05-09T10:00:00Z'), 'America/New_York')).toBe('morning');
  });

  it('returns morning at 05:00 NY (boundary)', () => {
    expect(deriveGreetingSlot(new Date('2026-05-09T09:00:00Z'), 'America/New_York')).toBe('morning');
  });

  it('returns afternoon at 13:00 NY', () => {
    expect(deriveGreetingSlot(new Date('2026-05-09T17:00:00Z'), 'America/New_York')).toBe('afternoon');
  });

  it('returns evening at 19:00 NY', () => {
    expect(deriveGreetingSlot(new Date('2026-05-09T23:00:00Z'), 'America/New_York')).toBe('evening');
  });

  it('returns null at 23:30 NY', () => {
    expect(deriveGreetingSlot(new Date('2026-05-10T03:30:00Z'), 'America/New_York')).toBe(null);
  });

  it('returns null at 04:59 NY', () => {
    expect(deriveGreetingSlot(new Date('2026-05-09T08:59:00Z'), 'America/New_York')).toBe(null);
  });

  it('handles Asia/Tokyo (positive offset)', () => {
    // 2026-05-09 08:00 Tokyo = 23:00 UTC previous day
    expect(deriveGreetingSlot(new Date('2026-05-08T23:00:00Z'), 'Asia/Tokyo')).toBe('morning');
  });
});
