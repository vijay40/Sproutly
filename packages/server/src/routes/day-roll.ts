import type { Hono } from 'hono';
import { ApiError, DayRollRequest } from '@sproutly/api-contract';
import { getDb } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { runDayRollForFamily } from '../services/day-roll.js';

export function dayRollRoute(app: Hono): void {
  app.post('/day-roll', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    if (!ctx.timezone) {
      throw new ApiError('INTERNAL', 'Family timezone missing');
    }
    let raw: unknown = {};
    try {
      raw = await c.req.json();
    } catch {
      raw = {};
    }
    const body = DayRollRequest.parse(raw);
    const db = getDb();
    const out = await runDayRollForFamily(
      db,
      { ...ctx, family_id: ctx.family_id!, timezone: ctx.timezone },
      new Date(),
      body,
    );
    return c.json(out);
  });
}
