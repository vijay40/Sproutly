import { describe, it, expect } from 'vitest';
import {
  friendlyLabel,
  groupByContinent,
  searchZones,
  getAllZones,
} from './timezones';

describe('friendlyLabel', () => {
  it('turns the last segment into a human label', () => {
    expect(friendlyLabel('America/Los_Angeles')).toBe('Los Angeles');
    expect(friendlyLabel('Europe/London')).toBe('London');
    expect(friendlyLabel('Asia/Tokyo')).toBe('Tokyo');
  });

  it('handles 3-segment IANA ids by taking the last segment', () => {
    expect(friendlyLabel('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
  });

  it('replaces underscores with spaces', () => {
    expect(friendlyLabel('America/New_York')).toBe('New York');
  });

  it('returns the raw id when there is no slash', () => {
    expect(friendlyLabel('UTC')).toBe('UTC');
  });
});

describe('getAllZones', () => {
  it('returns a non-empty list of IANA zone strings', () => {
    const zones = getAllZones();
    expect(zones.length).toBeGreaterThan(50);
    expect(zones).toContain('America/Los_Angeles');
    expect(zones).toContain('Europe/London');
    expect(zones.every((z) => typeof z === 'string')).toBe(true);
  });
});

describe('groupByContinent', () => {
  it('groups zones by the first IANA segment', () => {
    const groups = groupByContinent(['America/Los_Angeles', 'Europe/London', 'America/New_York']);
    expect(groups.find((g) => g.continent === 'America')?.zones).toEqual([
      'America/Los_Angeles',
      'America/New_York',
    ]);
    expect(groups.find((g) => g.continent === 'Europe')?.zones).toEqual(['Europe/London']);
  });

  it('orders continents alphabetically', () => {
    const groups = groupByContinent(['Pacific/Auckland', 'Africa/Cairo', 'Europe/London']);
    expect(groups.map((g) => g.continent)).toEqual(['Africa', 'Europe', 'Pacific']);
  });

  it('puts single-segment zones under "Other"', () => {
    const groups = groupByContinent(['UTC', 'Europe/London']);
    expect(groups.find((g) => g.continent === 'Other')?.zones).toEqual(['UTC']);
  });
});

describe('searchZones', () => {
  const zones = [
    'America/Los_Angeles',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
  ];

  it('matches against friendly label case-insensitively', () => {
    expect(searchZones(zones, 'los')).toEqual(['America/Los_Angeles']);
    expect(searchZones(zones, 'LONDON')).toEqual(['Europe/London']);
  });

  it('matches against the raw IANA id', () => {
    expect(searchZones(zones, 'asia')).toEqual(['Asia/Tokyo']);
  });

  it('returns all zones when query is empty', () => {
    expect(searchZones(zones, '')).toEqual(zones);
    expect(searchZones(zones, '   ')).toEqual(zones);
  });
});
