import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { z } from 'zod';
import { ApiError, ApiErrorBodySchema } from '@sproutly/api-contract';
import { registerErrorHandler } from '../src/middleware/errors.js';

describe('error middleware', () => {
  it('maps ApiError to envelope', async () => {
    const app = new Hono();
    registerErrorHandler(app);
    app.get('/x', () => {
      throw new ApiError('NOT_FOUND', 'nope');
    });
    const res = await app.request('http://test/x');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(() => ApiErrorBodySchema.parse(json)).not.toThrow();
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('maps ZodError to VALIDATION with fields', async () => {
    const app = new Hono();
    registerErrorHandler(app);
    app.get('/z', () => {
      z.object({ a: z.string() }).parse({});
    });
    const res = await app.request('http://test/z');
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION');
    expect(json.error.fields).toBeDefined();
  });

  it('maps unknown errors to INTERNAL without stack leak', async () => {
    const app = new Hono();
    registerErrorHandler(app);
    app.get('/u', () => {
      throw new Error('secret stack line');
    });
    const res = await app.request('http://test/u');
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('INTERNAL');
    expect(JSON.stringify(json)).not.toContain('secret stack');
  });
});
