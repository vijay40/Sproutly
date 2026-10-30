import type { Hono } from 'hono';
import {
  ApiError,
  Child,
  ChildrenListResponse,
  CreateChildRequest,
  UpdateChildRequest,
} from '@sproutly/api-contract';
import { getDb } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseBody } from '../middleware/validate.js';

export function childrenRoute(app: Hono): void {
  app.get('/children', authMiddleware({ requireFamily: false }), async (c) => {
    const ctx = c.get('ctx');
    if (!ctx.family_id) {
      return c.json(ChildrenListResponse.parse([]));
    }
    const db = getDb();
    const { data, error } = await db.from('children').select('*').eq('family_id', ctx.family_id);
    if (error) {
      throw new ApiError('INTERNAL', 'Failed to list children');
    }
    return c.json(ChildrenListResponse.parse(data ?? []));
  });

  app.post('/children', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const body = await parseBody(CreateChildRequest, c);
    const db = getDb();

    const { count, error: countErr } = await db
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', ctx.family_id!);
    if (countErr) {
      throw new ApiError('INTERNAL', 'Failed to check existing children');
    }
    if ((count ?? 0) > 0) {
      throw new ApiError('CONFLICT', 'Family already has a child');
    }

    const insertRow = {
      family_id: ctx.family_id!,
      name: body.name,
      age: body.age ?? null,
      avatar_emoji: body.avatar_emoji ?? null,
    };

    const { data, error } = await db
      .from('children') // @scope-ok-no-family: insertRow.family_id from ctx.family_id
      .insert(insertRow)
      .select('*')
      .single();
    if (error || !data) {
      throw new ApiError('INTERNAL', 'Failed to create child');
    }
    return c.json(Child.parse(data), 201);
  });

  app.patch('/children/:id', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    if (!id) {
      throw new ApiError('VALIDATION', 'Missing child id');
    }
    const body = await parseBody(UpdateChildRequest, c);
    const db = getDb();

    const { data: existing, error: readErr } = await db
      .from('children')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (readErr) {
      throw new ApiError('INTERNAL', 'Failed to load child');
    }
    if (!existing || existing.family_id !== ctx.family_id) {
      throw new ApiError('FORBIDDEN', 'Child not in your family');
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.age !== undefined) updates.age = body.age;
    if (body.avatar_emoji !== undefined) updates.avatar_emoji = body.avatar_emoji;

    if (Object.keys(updates).length === 0) {
      return c.json(Child.parse(existing));
    }

    const { data: updated, error } = await db
      .from('children')
      .update(updates)
      .eq('id', id)
      .eq('family_id', ctx.family_id!)
      .select('*')
      .single();
    if (error || !updated) {
      throw new ApiError('INTERNAL', 'Failed to update child');
    }
    return c.json(Child.parse(updated));
  });
}
