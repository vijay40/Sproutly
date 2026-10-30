import type { Hono } from 'hono';
import {
  CreateTaskCompletionRequest,
  TaskCompletionsListQuery,
} from '@sproutly/api-contract';
import { authMiddleware } from '../middleware/auth.js';
import { parseBody, parseQuery } from '../middleware/validate.js';
import {
  createTaskCompletion,
  deleteTaskCompletion,
  listTaskCompletions,
} from '../services/task-completions.js';
import { getDb } from '../db/client.js';
import { ApiError } from '@sproutly/api-contract';

export function taskCompletionsRoute(app: Hono): void {
  app.post('/task-completions', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    if (!ctx.timezone) {
      throw new ApiError('INTERNAL', 'Family timezone missing');
    }
    const body = await parseBody(CreateTaskCompletionRequest, c);
    const db = getDb();
    const out = await createTaskCompletion(db, { ...ctx, family_id: ctx.family_id!, timezone: ctx.timezone }, body, new Date());
    return c.json(out);
  });

  app.get('/task-completions', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    if (!ctx.timezone) {
      throw new ApiError('INTERNAL', 'Family timezone missing');
    }
    const q = parseQuery(TaskCompletionsListQuery, c);
    const db = getDb();
    const rows = await listTaskCompletions(db, { ...ctx, family_id: ctx.family_id!, timezone: ctx.timezone }, q, new Date());
    return c.json(rows);
  });

  app.delete('/task-completions/:id', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    if (!id) throw new ApiError('VALIDATION', 'Missing completion id');
    const db = getDb();
    const out = await deleteTaskCompletion(db, { ...ctx, family_id: ctx.family_id! }, id);
    return c.json(out);
  });
}
