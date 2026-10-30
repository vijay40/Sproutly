import { describe, it, expect, beforeEach } from 'vitest';
import { loadKidCache, saveKidCache, type KidCacheStorage, type KidCachePayload } from './kidCache';

function memStorage(): KidCacheStorage & { _m: Map<string, string> } {
  const m = new Map<string, string>();
  return {
    _m: m,
    async getItem(k) { return m.get(k) ?? null; },
    async setItem(k, v) { m.set(k, v); },
    async removeItem(k) { m.delete(k); },
  };
}

const SAMPLE: KidCachePayload = {
  tasks: [],
  completions: [],
  child: { id: 'c1', family_id: 'f1', name: 'A', age: 8, avatar_emoji: null, successful_days: 12, last_evaluated_date: null, pending_stage_transition: false, created_at: '' } as never,
  family: { id: 'f1', parent_user_id: null, timezone: 'America/New_York', created_at: '' } as never,
  lastCompletedAt: '2026-05-09T14:00:00Z',
};

describe('kidCache', () => {
  let storage: ReturnType<typeof memStorage>;
  beforeEach(() => { storage = memStorage(); });

  it('round-trips save/load for a given childId+date', async () => {
    await saveKidCache(storage, { childId: 'c1', localDate: '2026-05-09', payload: SAMPLE });
    const out = await loadKidCache(storage, { childId: 'c1', localDate: '2026-05-09' });
    expect(out).toEqual(SAMPLE);
  });

  it('returns null when key is missing', async () => {
    const out = await loadKidCache(storage, { childId: 'c1', localDate: '2026-05-09' });
    expect(out).toBe(null);
  });

  it('isolates by childId', async () => {
    await saveKidCache(storage, { childId: 'c1', localDate: '2026-05-09', payload: SAMPLE });
    const out = await loadKidCache(storage, { childId: 'c2', localDate: '2026-05-09' });
    expect(out).toBe(null);
  });

  it('isolates by localDate', async () => {
    await saveKidCache(storage, { childId: 'c1', localDate: '2026-05-09', payload: SAMPLE });
    const out = await loadKidCache(storage, { childId: 'c1', localDate: '2026-05-10' });
    expect(out).toBe(null);
  });

  it('returns null and self-heals on malformed JSON', async () => {
    await storage.setItem('kid.today.c1.2026-05-09', '{not json');
    const out = await loadKidCache(storage, { childId: 'c1', localDate: '2026-05-09' });
    expect(out).toBe(null);
  });
});
