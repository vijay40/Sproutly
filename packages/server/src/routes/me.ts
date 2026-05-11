import type { Hono } from 'hono';
import { ApiError, GetMeResponse, PatchMeRequest } from '@sproutly/api-contract';
import { getDb } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseBody } from '../middleware/validate.js';
import { assertValidIanaTimeZone } from '../lib/timezone.js';

async function buildMePayload(userId: string, familyId: string | null, timezone: string | null) {
  let has_onboarded = false;
  if (familyId) {
    const db = getDb();
    const { count, error } = await db
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId);
    if (error) throw new ApiError('INTERNAL', 'Failed to load children');
    has_onboarded = (count ?? 0) > 0;
  }
  return GetMeResponse.parse({
    user_id: userId,
    family_id: familyId,
    timezone,
    has_onboarded,
  });
}

export function meRoute(app: Hono): void {
  app.get('/me', authMiddleware({ requireFamily: false }), async (c) => {
    const ctx = c.get('ctx');
    const body = await buildMePayload(ctx.user_id, ctx.family_id, ctx.timezone);
    return c.json(body);
  });

  app.patch('/me', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const raw = await parseBody(PatchMeRequest, c);
    if (raw.timezone === undefined) {
      throw new ApiError('VALIDATION', 'No fields to update', { body: 'provide timezone' });
    }
    assertValidIanaTimeZone(raw.timezone);

    const db = getDb();
    const { data: fam, error } = await db
      .from('families')
      .update({ timezone: raw.timezone })
      .eq('id', ctx.family_id!)
      .eq('parent_user_id', ctx.user_id)
      .select('id, timezone')
      .single();

    if (error || !fam) {
      throw new ApiError('INTERNAL', 'Failed to update family');
    }

    const body = await buildMePayload(ctx.user_id, fam.id, fam.timezone);
    return c.json(body);
  });
}
