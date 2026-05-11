import type { Hono } from 'hono';
import { ApiError, CreateFamilyRequest, CreateFamilyResponse } from '@sproutly/api-contract';
import { getDb } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseBody } from '../middleware/validate.js';
import { assertValidIanaTimeZone } from '../lib/timezone.js';

export function familiesRoute(app: Hono): void {
  app.post('/families', authMiddleware({ requireFamily: false }), async (c) => {
    const ctx = c.get('ctx');
    const body = await parseBody(CreateFamilyRequest, c);
    assertValidIanaTimeZone(body.timezone);

    const db = getDb();

    const { data: existing, error: exErr } = await db
      .from('families')
      .select('id')
      .eq('parent_user_id', ctx.user_id)
      .maybeSingle();
    if (exErr) throw new ApiError('INTERNAL', 'Failed to check family');
    if (existing) throw new ApiError('CONFLICT', 'Family already exists for this user');

    const { data: inserted, error: insErr } = await db
      .from('families') // @scope-ok-no-family: insert binds parent_user_id from ctx, not via .eq
      .insert({ parent_user_id: ctx.user_id, timezone: body.timezone })
      .select('id, parent_user_id, timezone, created_at')
      .single();
    if (insErr || !inserted) throw new ApiError('INTERNAL', 'Failed to create family');

    return c.json(CreateFamilyResponse.parse(inserted), 201);
  });
}
