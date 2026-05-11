import type { Hono } from 'hono';
import { GetHealthResponse } from '@sproutly/api-contract';

export function healthRoute(app: Hono): void {
  app.get('/health', (c) => {
    const body = GetHealthResponse.parse({
      ok: true as const,
      version: process.env.GIT_SHA ?? 'dev',
    });
    return c.json(body);
  });
}
