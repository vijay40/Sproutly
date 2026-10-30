import type { Hono } from 'hono';
import {
  ApiError,
  CreateTaskRequest,
  Task,
  TasksListQuery,
  TasksListResponse,
  UpdateTaskRequest,
} from '@sproutly/api-contract';
import { getDb } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseBody, parseQuery } from '../middleware/validate.js';

async function childIdsForFamily(db: ReturnType<typeof getDb>, familyId: string): Promise<string[]> {
  const { data, error } = await db.from('children').select('id').eq('family_id', familyId);
  if (error) {
    throw new ApiError('INTERNAL', 'Failed to load children');
  }
  return (data ?? []).map((r: { id: string }) => r.id);
}

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

async function loadTaskForFamily(
  db: ReturnType<typeof getDb>,
  taskId: string,
  familyId: string,
): Promise<Record<string, unknown> | null> {
  const { data: task, error: tErr } = await db
    .from('tasks') // @scope-ok-no-family: family enforced via assertChildInFamily on task.child_id
    .select('*')
    .eq('id', taskId)
    .maybeSingle();
  if (tErr) {
    throw new ApiError('INTERNAL', 'Failed to load task');
  }
  if (!task) return null;
  await assertChildInFamily(db, String((task as { child_id: string }).child_id), familyId);
  return task as Record<string, unknown>;
}

export function tasksRoute(app: Hono): void {
  app.get('/tasks', authMiddleware({ requireFamily: false }), async (c) => {
    const ctx = c.get('ctx');
    if (!ctx.family_id) {
      return c.json(TasksListResponse.parse([]));
    }
    const q = parseQuery(TasksListQuery, c);
    const db = getDb();
    const childIds = await childIdsForFamily(db, ctx.family_id);
    if (childIds.length === 0) {
      return c.json(TasksListResponse.parse([]));
    }
    if (q.child_id && !childIds.includes(q.child_id)) {
      throw new ApiError('FORBIDDEN', 'Child is not in your family');
    }

    let qb = db
      .from('tasks') // @scope-ok-no-family: child_id filtered to family's children
      .select('*')
      .in('child_id', q.child_id ? [q.child_id] : childIds);
    const activeMode = q.is_active ?? 'true';
    if (activeMode === 'true') {
      qb = qb.eq('is_active', true);
    } else if (activeMode === 'false') {
      qb = qb.eq('is_active', false);
    }
    if (q.is_bonus === 'true') {
      qb = qb.eq('is_bonus', true);
    } else if (q.is_bonus === 'false') {
      qb = qb.eq('is_bonus', false);
    }

    const { data, error } = await qb.order('created_at', { ascending: false });
    if (error) {
      throw new ApiError('INTERNAL', 'Failed to list tasks');
    }
    return c.json(TasksListResponse.parse(data ?? []));
  });

  app.post('/tasks', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const body = await parseBody(CreateTaskRequest, c);
    const db = getDb();
    await assertChildInFamily(db, body.child_id, ctx.family_id!);

    const insertRow = {
      child_id: body.child_id,
      title: body.title,
      icon: body.icon ?? null,
      category: body.category,
      time_slot: body.time_slot,
      difficulty: body.difficulty ?? 1,
      recurrence: body.recurrence,
      recurrence_days: body.recurrence === 'custom' ? body.recurrence_days ?? null : null,
      is_bonus: body.is_bonus ?? false,
    };

    const { data, error } = await db
      .from('tasks') // @scope-ok-no-family: child_id verified to ctx.family_id above
      .insert(insertRow)
      .select('*')
      .single();
    if (error || !data) {
      throw new ApiError('INTERNAL', 'Failed to create task');
    }
    return c.json(Task.parse(data), 201);
  });

  app.patch('/tasks/:id', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    if (!id) throw new ApiError('VALIDATION', 'Missing task id');
    const body = await parseBody(UpdateTaskRequest, c);
    const db = getDb();
    const existing = await loadTaskForFamily(db, id, ctx.family_id!);
    if (!existing) {
      throw new ApiError('NOT_FOUND', 'Task not found');
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.category !== undefined) updates.category = body.category;
    if (body.time_slot !== undefined) updates.time_slot = body.time_slot;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.difficulty !== undefined) updates.difficulty = body.difficulty;
    if (body.recurrence !== undefined) {
      updates.recurrence = body.recurrence;
      updates.recurrence_days =
        body.recurrence === 'custom' ? (body.recurrence_days ?? null) : null;
    } else if (body.recurrence_days !== undefined) {
      updates.recurrence_days = body.recurrence_days;
    }
    if (body.is_bonus !== undefined) updates.is_bonus = body.is_bonus;

    if (Object.keys(updates).length === 0) {
      return c.json(Task.parse(existing));
    }

    const { data, error } = await db
      .from('tasks') // @scope-ok-no-family: row scoped in loadTaskForFamily
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) {
      throw new ApiError('INTERNAL', 'Failed to update task');
    }
    return c.json(Task.parse(data));
  });

  app.delete('/tasks/:id', authMiddleware({ requireFamily: true }), async (c) => {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    if (!id) throw new ApiError('VALIDATION', 'Missing task id');
    const db = getDb();
    const existing = await loadTaskForFamily(db, id, ctx.family_id!);
    if (!existing) {
      throw new ApiError('NOT_FOUND', 'Task not found');
    }
    if (existing.is_active === false) {
      return c.json(Task.parse(existing));
    }
    const { data, error } = await db
      .from('tasks') // @scope-ok-no-family: row scoped in loadTaskForFamily
      .update({ is_active: false })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) {
      throw new ApiError('INTERNAL', 'Failed to delete task');
    }
    return c.json(Task.parse(data));
  });
}
