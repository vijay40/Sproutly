import type { Hono } from 'hono';
import {
  ApiError,
  DailySummariesListQuery,
  DailySummariesListResponse,
} from '@sproutly/api-contract';
import { getDb } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseQuery } from '../middleware/validate.js';
import { todayYmdInTz, ymdAddDays } from '../lib/local-date.js';

async function assertChildInFamily(
  db: ReturnType<typeof getDb>,
  childId: string,
  familyId: string,
): Promise<void> {
  const { data, error } = await db
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('family_id', familyId)
    .maybeSingle();
  if (error) {
    throw new ApiError('INTERNAL', 'Failed to verify child');
  }
  if (!data) {
    throw new ApiError('FORBIDDEN', 'Child is not in your family');
  }
}

export function dailySummariesRoute(app: Hono): void {
  app.get('/daily-summaries', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const q = parseQuery(DailySummariesListQuery, c);
    const db = getDb();
    await assertChildInFamily(db, q.child_id, ctx.family_id!);

    const tz = ctx.timezone ?? 'UTC';
    const today = todayYmdInTz(tz);
    const from = q.from ?? ymdAddDays(today, -29, tz);
    const to = q.to ?? today;
    if (from > to) {
      throw new ApiError('VALIDATION', 'from must be on or before to');
    }
    const spanDays =
      Math.floor(
        (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86400000,
      ) + 1;
    if (spanDays > 90) {
      throw new ApiError('VALIDATION', 'Range must be at most 90 days');
    }

    const { data, error } = await db
      .from('daily_summaries') // @scope-ok-no-family: child_id verified to caller family above
      .select('*')
      .eq('child_id', q.child_id)
      .gte('local_date', from)
      .lte('local_date', to)
      .order('local_date', { ascending: true });
    if (error) {
      throw new ApiError('INTERNAL', 'Failed to list daily summaries');
    }
    return c.json(DailySummariesListResponse.parse(data ?? []));
  });
}
