import { describe, expect, it } from 'vitest';
import { relativeTime } from './relativeTime';

const NOW = new Date('2026-05-05T12:00:00Z');

describe('relativeTime', () => {
  it('shows "just now" within 60 seconds', () => {
    expect(relativeTime(new Date('2026-05-05T11:59:30Z'), NOW)).toBe('just now');
  });

  it('shows minutes', () => {
    expect(relativeTime(new Date('2026-05-05T11:55:00Z'), NOW)).toBe('5 minutes ago');
    expect(relativeTime(new Date('2026-05-05T11:59:00Z'), NOW)).toBe('1 minute ago');
  });

  it('shows hours', () => {
    expect(relativeTime(new Date('2026-05-05T09:00:00Z'), NOW)).toBe('3 hours ago');
    expect(relativeTime(new Date('2026-05-05T11:00:00Z'), NOW)).toBe('1 hour ago');
  });

  it('shows days', () => {
    expect(relativeTime(new Date('2026-05-02T12:00:00Z'), NOW)).toBe('3 days ago');
    expect(relativeTime(new Date('2026-05-04T12:00:00Z'), NOW)).toBe('1 day ago');
  });

  it('shows weeks up to 4 weeks', () => {
    expect(relativeTime(new Date('2026-04-21T12:00:00Z'), NOW)).toBe('2 weeks ago');
    expect(relativeTime(new Date('2026-04-28T12:00:00Z'), NOW)).toBe('1 week ago');
  });

  it('shows a formatted date beyond 4 weeks', () => {
    expect(relativeTime(new Date('2026-03-01T12:00:00Z'), NOW)).toBe('Mar 1, 2026');
  });
});
