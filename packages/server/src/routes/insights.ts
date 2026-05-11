import type { Hono } from 'hono';
import { ApiError, Insight, InsightsListQuery, InsightsListResponse } from '@sproutly/api-contract';
import { getDb } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseQuery } from '../middleware/validate.js';

export function insightsRoute(app: Hono): void {
  app.get('/insights', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const q = parseQuery(InsightsListQuery, c);
    const state = q.state ?? 'active';
    const db = getDb();
    let qb = db.from('ai_insights').select('*').eq('family_id', ctx.family_id!);
    if (state === 'active') {
      qb = qb.eq('is_applied', false).eq('is_dismissed', false);
    } else if (state === 'applied') {
      qb = qb.eq('is_applied', true);
    } else if (state === 'dismissed') {
      qb = qb.eq('is_dismissed', true);
    }
    const { data, error } = await qb.order('generated_at', { ascending: false });
    if (error) {
      throw new ApiError('INTERNAL', 'Failed to list insights');
    }
    return c.json(InsightsListResponse.parse(data ?? []));
  });

  app.post('/insights/:id/apply', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    if (!id) throw new ApiError('VALIDATION', 'Missing insight id');
    const db = getDb();
    const { data, error } = await db
      .from('ai_insights')
      .update({ is_applied: true })
      .eq('id', id)
      .eq('family_id', ctx.family_id!)
      .select('*')
      .maybeSingle();
    if (error) {
      throw new ApiError('INTERNAL', 'Failed to apply insight');
    }
    if (!data) {
      throw new ApiError('NOT_FOUND', 'Insight not found');
    }
    return c.json(Insight.parse(data));
  });

  app.post('/insights/:id/dismiss', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    if (!id) throw new ApiError('VALIDATION', 'Missing insight id');
    const db = getDb();
    const { data, error } = await db
      .from('ai_insights')
      .update({ is_dismissed: true })
      .eq('id', id)
      .eq('family_id', ctx.family_id!)
      .select('*')
      .maybeSingle();
    if (error) {
      throw new ApiError('INTERNAL', 'Failed to dismiss insight');
    }
    if (!data) {
      throw new ApiError('NOT_FOUND', 'Insight not found');
    }
    return c.json(Insight.parse(data));
  });
}
