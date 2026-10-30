import { describe, expect, it, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { setDbForTests } from '../src/db/client.js';

const secret = 'children-test-secret';
const uid = '11111111-1111-4111-8111-111111111111';
const famId = '22222222-2222-4222-8222-222222222222';
const childId = '33333333-3333-4333-8333-333333333333';
const otherFam = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function bearer(): string {
  return `Bearer ${jwt.sign({ sub: uid, role: 'authenticated' }, secret, { algorithm: 'HS256' })}`;
}

const baseChild = {
  id: childId,
  family_id: famId,
  name: 'Alex',
  age: 7,
  avatar_emoji: '🦄',
  successful_days: 0,
  last_evaluated_date: null,
  pending_stage_transition: false,
  created_at: '2026-05-01T12:00:00.000Z',
};

function mockDb(opts: {
  family: { id: string; timezone: string } | null;
  childrenList?: unknown[];
  childHeadCount?: number;
  maybeChild?: unknown | null;
  insertResult?: unknown;
  updateResult?: unknown;
}) {
  const list = opts.childrenList ?? [];
  const fam = opts.family;
  return {
    from(table: string) {
      if (table === 'families') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: fam, error: null }),
            }),
          }),
        };
      }
      if (table === 'children') {
        return {
          select: (cols?: string, countOpts?: { count: string; head: boolean }) => {
            if (countOpts?.head) {
              return {
                eq: async () => ({ count: opts.childHeadCount ?? 0, error: null }),
              };
            }
            return {
              eq: (col: string) => {
                if (col === 'family_id') {
                  return Promise.resolve({ data: list, error: null });
                }
                if (col === 'id') {
                  return {
                    maybeSingle: async () => ({ data: opts.maybeChild ?? null, error: null }),
                  };
                }
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
          insert: () => ({
            select: () => ({
              single: async () => ({ data: opts.insertResult ?? baseChild, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: opts.updateResult ?? baseChild, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as import('@supabase/supabase-js').SupabaseClient;
}

describe('/children', () => {
  beforeEach(() => {
    process.env.VITEST = 'true';
    process.env.SUPABASE_JWT_SECRET = secret;
    setDbForTests(null);
    vi.restoreAllMocks();
  });

  it('GET returns 401 without token', async () => {
    const app = createApp();
    const res = await app.request('http://test/children');
    expect(res.status).toBe(401);
  });

  it('GET returns [] when no family', async () => {
    setDbForTests(mockDb({ family: null }));
    const app = createApp();
    const res = await app.request('http://test/children', { headers: { Authorization: bearer() } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('GET returns children for family', async () => {
    setDbForTests(
      mockDb({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        childrenList: [baseChild],
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/children', { headers: { Authorization: bearer() } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe(childId);
  });

  it('POST returns 403 without family', async () => {
    setDbForTests(mockDb({ family: null }));
    const app = createApp();
    const res = await app.request('http://test/children', {
      method: 'POST',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alex' }),
    });
    expect(res.status).toBe(403);
  });

  it('POST returns 201 and child', async () => {
    setDbForTests(
      mockDb({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        childHeadCount: 0,
        insertResult: baseChild,
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/children', {
      method: 'POST',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alex', age: 7 }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.name).toBe('Alex');
  });

  it('POST returns 409 when child already exists', async () => {
    setDbForTests(
      mockDb({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        childHeadCount: 1,
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/children', {
      method: 'POST',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alex' }),
    });
    expect(res.status).toBe(409);
  });

  it('POST returns 422 when name missing', async () => {
    setDbForTests(
      mockDb({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        childHeadCount: 0,
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/children', {
      method: 'POST',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ age: 7 }),
    });
    expect(res.status).toBe(422);
  });

  it('POST returns 422 when successful_days sneaks in', async () => {
    setDbForTests(
      mockDb({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        childHeadCount: 0,
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/children', {
      method: 'POST',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alex', successful_days: 99 }),
    });
    expect(res.status).toBe(422);
  });

  it('PATCH returns 403 for child in another family', async () => {
    setDbForTests(
      mockDb({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        maybeChild: { ...baseChild, family_id: otherFam },
      }),
    );
    const app = createApp();
    const res = await app.request(`http://test/children/${childId}`, {
      method: 'PATCH',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Z' }),
    });
    expect(res.status).toBe(403);
  });

  it('PATCH returns 422 for unknown fields', async () => {
    setDbForTests(
      mockDb({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        maybeChild: baseChild,
      }),
    );
    const app = createApp();
    const res = await app.request(`http://test/children/${childId}`, {
      method: 'PATCH',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_stage: 5 }),
    });
    expect(res.status).toBe(422);
  });

  it('PATCH returns 200 for name update', async () => {
    const updated = { ...baseChild, name: 'Alexa' };
    setDbForTests(
      mockDb({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        maybeChild: baseChild,
        updateResult: updated,
      }),
    );
    const app = createApp();
    const res = await app.request(`http://test/children/${childId}`, {
      method: 'PATCH',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alexa' }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe('Alexa');
  });
});
