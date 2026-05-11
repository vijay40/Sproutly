import { describe, expect, it, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { setDbForTests } from '../src/db/client.js';

const secret = 'families-test-secret';
const uid = '11111111-1111-4111-8111-111111111111';
const famId = '22222222-2222-4222-8222-222222222222';

function bearer(): string {
  return `Bearer ${jwt.sign({ sub: uid, role: 'authenticated' }, secret, { algorithm: 'HS256' })}`;
}

type MockConfig = {
  existingFamily: { id: string; timezone: string } | null;
  inserted?: { id: string; parent_user_id: string; timezone: string; created_at: string };
};

function supabaseMock(config: MockConfig) {
  const insertChain = {
    select: () => insertChain,
    single: async () => ({ data: config.inserted, error: null }),
  };
  const selectChain = {
    select: () => selectChain,
    eq: () => selectChain,
    maybeSingle: async () => ({ data: config.existingFamily, error: null }),
  };
  return {
    from(table: string) {
      if (table !== 'families') {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: selectChain.select,
        eq: selectChain.eq,
        maybeSingle: selectChain.maybeSingle,
        insert: () => insertChain,
      };
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('POST /families', () => {
  beforeEach(() => {
    process.env.VITEST = 'true';
    process.env.SUPABASE_JWT_SECRET = secret;
    setDbForTests(null);
    vi.restoreAllMocks();
  });

  it('401 without token', async () => {
    const app = createApp();
    const res = await app.request('http://test/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: 'America/Los_Angeles' }),
    });
    expect(res.status).toBe(401);
  });

  it('422 on invalid timezone', async () => {
    setDbForTests(supabaseMock({ existingFamily: null }));
    const app = createApp();
    const res = await app.request('http://test/families', {
      method: 'POST',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: 'not-a-zone' }),
    });
    expect(res.status).toBe(422);
  });

  it('422 on empty body', async () => {
    setDbForTests(supabaseMock({ existingFamily: null }));
    const app = createApp();
    const res = await app.request('http://test/families', {
      method: 'POST',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it('409 if a family already exists for this user', async () => {
    setDbForTests(
      supabaseMock({
        existingFamily: { id: famId, timezone: 'America/Los_Angeles' },
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/families', {
      method: 'POST',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: 'America/Los_Angeles' }),
    });
    expect(res.status).toBe(409);
  });

  it('201 creates a family and returns it', async () => {
    const created = {
      id: famId,
      parent_user_id: uid,
      timezone: 'America/Los_Angeles',
      created_at: '2026-05-11T00:00:00.000Z',
    };
    setDbForTests(
      supabaseMock({
        existingFamily: null,
        inserted: created,
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/families', {
      method: 'POST',
      headers: { Authorization: bearer(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: 'America/Los_Angeles' }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual(created);
  });
});
