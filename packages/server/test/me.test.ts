import { describe, expect, it, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { setDbForTests } from '../src/db/client.js';

const secret = 'me-test-secret';
const uid = '11111111-1111-4111-8111-111111111111';
const famId = '22222222-2222-4222-8222-222222222222';

function bearer(): string {
  return `Bearer ${jwt.sign({ sub: uid, role: 'authenticated' }, secret, { algorithm: 'HS256' })}`;
}

function supabaseMock(config: {
  family: { id: string; timezone: string } | null;
  childCount: number;
  afterUpdate?: { id: string; timezone: string };
}) {
  const fb: Record<string, unknown> = {};
  fb.select = () => fb;
  fb.eq = () => fb;
  fb.update = () => fb;
  fb.maybeSingle = async () => ({ data: config.family, error: null });
  fb.single = async () => ({ data: config.afterUpdate ?? config.family, error: null });

  return {
    from(table: string) {
      if (table === 'children') {
        return {
          select: (_cols?: string, _opts?: { count: string; head: boolean }) => ({
            eq: async () => ({ count: config.childCount, error: null }),
          }),
        };
      }
      return fb;
    },
  } as import('@supabase/supabase-js').SupabaseClient;
}

describe('/me', () => {
  beforeEach(() => {
    process.env.VITEST = 'true';
    process.env.SUPABASE_JWT_SECRET = secret;
    setDbForTests(null);
    vi.restoreAllMocks();
  });

  it('returns 401 without token', async () => {
    const app = createApp();
    const res = await app.request('http://test/me');
    expect(res.status).toBe(401);
  });

  it('GET returns has_onboarded from children count', async () => {
    setDbForTests(
      supabaseMock({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        childCount: 1,
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/me', { headers: { Authorization: bearer() } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user_id).toBe(uid);
    expect(json.family_id).toBe(famId);
    expect(json.has_onboarded).toBe(true);
  });

  it('GET has_onboarded false when no children', async () => {
    setDbForTests(
      supabaseMock({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        childCount: 0,
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/me', { headers: { Authorization: bearer() } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.has_onboarded).toBe(false);
  });

  it('PATCH updates timezone', async () => {
    const after = { id: famId, timezone: 'America/New_York' };
    setDbForTests(
      supabaseMock({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        childCount: 0,
        afterUpdate: after,
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/me', {
      method: 'PATCH',
      headers: {
        Authorization: bearer(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timezone: 'America/New_York' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.timezone).toBe('America/New_York');
  });

  it('PATCH rejects invalid timezone', async () => {
    setDbForTests(
      supabaseMock({
        family: { id: famId, timezone: 'America/Los_Angeles' },
        childCount: 0,
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/me', {
      method: 'PATCH',
      headers: {
        Authorization: bearer(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timezone: 'not-a-timezone' }),
    });
    expect(res.status).toBe(422);
  });
});
