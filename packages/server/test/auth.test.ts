import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { registerErrorHandler } from '../src/middleware/errors.js';
import { authMiddleware } from '../src/middleware/auth.js';
import { setDbForTests } from '../src/db/client.js';

const secret = 'test-auth-secret';

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    process.env.VITEST = 'true';
    process.env.SUPABASE_JWT_SECRET = secret;
    setDbForTests(null);
    vi.restoreAllMocks();
  });

  it('returns 401 when Authorization is missing', async () => {
    const app = new Hono();
    registerErrorHandler(app);
    app.get('/p', authMiddleware({ requireFamily: true }), (c) => c.json(c.get('ctx')));
    const res = await app.request('http://test/p');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const app = new Hono();
    registerErrorHandler(app);
    app.get('/p', authMiddleware({ requireFamily: true }), (c) => c.json(c.get('ctx')));
    const res = await app.request('http://test/p', { headers: { Authorization: 'Bearer bad' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 when family is required but none exists', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    setDbForTests({ from: mockFrom } as never);

    const app = new Hono();
    registerErrorHandler(app);
    app.get('/p', authMiddleware({ requireFamily: true }), (c) => c.json(c.get('ctx')));
    const token = jwt.sign({ sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated' }, secret, {
      algorithm: 'HS256',
    });
    const res = await app.request('http://test/p', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(403);
  });

  it('attaches ctx when family exists', async () => {
    const fam = { id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee', timezone: 'UTC' };
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: fam, error: null }),
    });
    setDbForTests({ from: mockFrom } as never);

    const app = new Hono();
    registerErrorHandler(app);
    app.get('/p', authMiddleware({ requireFamily: true }), (c) => c.json(c.get('ctx')));
    const uid = '00000000-0000-4000-8000-000000000001';
    const token = jwt.sign({ sub: uid, role: 'authenticated' }, secret, { algorithm: 'HS256' });
    const res = await app.request('http://test/p', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ user_id: uid, family_id: fam.id, timezone: fam.timezone });
  });
});
