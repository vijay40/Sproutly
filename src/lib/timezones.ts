// Pure helpers for the timezone picker. No React, no RN imports.
// Uses Intl.supportedValuesOf when available; bundled fallback otherwise.

const FALLBACK_ZONES = [
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota',
  'America/Chicago', 'America/Denver', 'America/Halifax', 'America/Lima',
  'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
  'America/Phoenix', 'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
  'Asia/Bangkok', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Jakarta',
  'Asia/Kolkata', 'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Seoul',
  'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo',
  'Atlantic/Reykjavik',
  'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney',
  'Europe/Amsterdam', 'Europe/Berlin', 'Europe/Dublin', 'Europe/Istanbul',
  'Europe/Lisbon', 'Europe/London', 'Europe/Madrid', 'Europe/Moscow',
  'Europe/Paris', 'Europe/Rome', 'Europe/Stockholm', 'Europe/Warsaw',
  'Europe/Zurich',
  'Pacific/Auckland', 'Pacific/Honolulu',
  'UTC',
];

export interface ContinentGroup {
  continent: string;
  zones: string[];
}

export function getAllZones(): string[] {
  try {
    const intlAny = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    if (typeof intlAny.supportedValuesOf === 'function') {
      const zones = intlAny.supportedValuesOf('timeZone');
      if (Array.isArray(zones) && zones.length > 0) return zones;
    }
  } catch {
    // fall through
  }
  return FALLBACK_ZONES.slice();
}

export function friendlyLabel(iana: string): string {
  if (!iana.includes('/')) return iana;
  const parts = iana.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

export function groupByContinent(zones: string[]): ContinentGroup[] {
  const map = new Map<string, string[]>();
  for (const z of zones) {
    const continent = z.includes('/') ? z.split('/')[0] : 'Other';
    if (!map.has(continent)) map.set(continent, []);
    map.get(continent)!.push(z);
  }
  const groups: ContinentGroup[] = [];
  for (const [continent, list] of map) {
    groups.push({ continent, zones: list.slice().sort() });
  }
  groups.sort((a, b) => a.continent.localeCompare(b.continent));
  return groups;
}

export function searchZones(zones: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return zones;
  return zones.filter((z) => {
    const label = friendlyLabel(z).toLowerCase();
    return z.toLowerCase().includes(q) || label.includes(q);
  });
}

const offsetCache = new Map<string, string>();
export function gmtOffset(iana: string, at: Date = new Date()): string {
  const key = `${iana}|${at.toDateString()}`;
  const cached = offsetCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: iana,
      timeZoneName: 'shortOffset',
    }).formatToParts(at);
    const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    offsetCache.set(key, name);
    return name;
  } catch {
    offsetCache.set(key, '');
    return '';
  }
}

export function guessDeviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
