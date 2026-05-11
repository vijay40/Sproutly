import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('request-log middleware', () => {
  it('sets X-Request-Id on GET /health', async () => {
    const app = createApp();
    const res = await app.request('http://test/health');
    expect(res.status).toBe(200);
    const id = res.headers.get('X-Request-Id');
    expect(id).toBeTruthy();
    expect(id).toMatch(uuidRe);
  });

  it('echoes incoming X-Request-Id', async () => {
    const app = createApp();
    const custom = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
    const res = await app.request('http://test/health', {
      headers: { 'X-Request-Id': custom },
    });
    expect(res.headers.get('X-Request-Id')).toBe(custom);
  });

  it('sets X-Request-Id on ApiError responses', async () => {
    const app = createApp();
    const res = await app.request('http://test/me');
    expect(res.status).toBe(401);
    const id = res.headers.get('X-Request-Id');
    expect(id).toBeTruthy();
    expect(id).toMatch(uuidRe);
  });
});
