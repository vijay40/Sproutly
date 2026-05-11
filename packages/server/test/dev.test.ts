import { describe, expect, it, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { setDbForTests } from '../src/db/client.js';

const secret = 'dev-test-secret';

describe('POST /dev/impersonate', () => {
  beforeEach(() => {
    process.env.VITEST = 'true';
    process.env.SUPABASE_JWT_SECRET = secret;
    process.env.NODE_ENV = 'development';
    setDbForTests(null);
    vi.restoreAllMocks();
  });

  it('returns 404 when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    const app = createApp();
    const res = await app.request('http://test/dev/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.co' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not a parent in any family', async () => {
    process.env.NODE_ENV = 'development';
    const uid = '33333333-3333-4333-8333-333333333333';
    const client = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: uid, email: 'orphan@example.com' }] },
            error: null,
          }),
        },
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as never;
    setDbForTests(client);

    const app = createApp();
    const res = await app.request('http://test/dev/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'orphan@example.com' }),
    });
    expect(res.status).toBe(403);
  });

  it('mints token for parent email', async () => {
    process.env.NODE_ENV = 'development';
    const uid = '44444444-4444-4444-8444-444444444444';
    const client = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: uid, email: 'parent@example.com' }] },
            error: null,
          }),
        },
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: '55555555-5555-4555-8555-555555555555' },
          error: null,
        }),
      })),
    } as never;
    setDbForTests(client);

    const app = createApp();
    const res = await app.request('http://test/dev/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'parent@example.com' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.access_token).toBeTruthy();
    const decoded = jwt.verify(json.access_token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    expect(decoded.sub).toBe(uid);
    expect(decoded.role).toBe('authenticated');
    expect(json.expires_at).toMatch(/^\d{4}-/);
  });

  it('returns 422 for malformed body', async () => {
    process.env.NODE_ENV = 'development';
    setDbForTests({ from: vi.fn(), auth: { admin: { listUsers: vi.fn() } } } as never);
    const app = createApp();
    const res = await app.request('http://test/dev/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect(res.status).toBe(422);
  });
});
