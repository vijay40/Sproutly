import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('GET /health', () => {
  it('returns ok and version', async () => {
    const app = createApp();
    const res = await app.request('http://test/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.version).toBe('string');
  });
});
