import type { Hono } from 'hono';
import { ApiError, Cosmetic, CosmeticsListResponse } from '@sproutly/api-contract';
import { getDb } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

export function cosmeticsRoute(app: Hono): void {
  app.get('/cosmetics', authMiddleware({ requireFamily: false }), async (c) => {
    const db = getDb();
    const { data, error } = await db
      .from('cosmetics') // @scope-ok-no-family: global catalog (no family_id column)
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      throw new ApiError('INTERNAL', 'Failed to list cosmetics');
    }
    return c.json(CosmeticsListResponse.parse(data ?? []));
  });
}
