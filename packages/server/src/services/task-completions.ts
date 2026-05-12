import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ApiError,
  CreateTaskCompletionRequest,
  TaskCompletion,
  TaskCompletionsListQuery,
} from '@sproutly/api-contract';
import type { RequestCtx } from '../middleware/auth.js';
import { todayYmdInTz, ymdDiffDays } from '../lib/local-date.js';

function isUniqueViolation(err: { code?: string; message?: string } | null): boolean {
  return err?.code === '23505' || (err?.message ?? '').includes('duplicate');
}

export async function createTaskCompletion(
  db: SupabaseClient,
  ctx: RequestCtx & { family_id: string; timezone: string | null },
  req: CreateTaskCompletionRequest,
  now: Date,
): Promise<{ completion: TaskCompletion; idempotent: boolean }> {
  const tz = ctx.timezone ?? 'UTC';
  const serverToday = todayYmdInTz(tz, now);

  let localDate: string;
  if (req.local_date !== undefined) {
    const diff = ymdDiffDays(req.local_date, serverToday, tz);
    if (diff > 1 || diff < -1) {
      throw new ApiError('VALIDATION', 'local_date must be within one day of today in family timezone');
    }
    localDate = req.local_date;
  } else {
    localDate = serverToday;
  }

  const { data: child, error: cErr } = await db
    .from('children')
    .select('id, family_id')
    .eq('id', req.child_id)
    .eq('family_id', ctx.family_id)
    .maybeSingle();
  if (cErr) {
    throw new ApiError('INTERNAL', 'Failed to verify child');
  }
  if (!child) {
    throw new ApiError('FORBIDDEN', 'Child is not in your family');
  }

  const { data: task, error: tErr } = await db
    .from('tasks')
    .select('id, child_id')
    .eq('id', req.task_id)
    .eq('child_id', req.child_id)
    .maybeSingle();
  if (tErr) {
    throw new ApiError('INTERNAL', 'Failed to verify task');
  }
  if (!task) {
    throw new ApiError('FORBIDDEN', 'Task does not belong to this child');
  }

  const insertRow = {
    task_id: req.task_id,
    child_id: req.child_id,
    local_date: localDate,
    marked_by_parent: true,
  };

  const { data: inserted, error: insErr } = await db
    .from('task_completions')
    .insert(insertRow)
    .select('*')
    .maybeSingle();

  if (!insErr && inserted) {
    return { completion: TaskCompletion.parse(inserted), idempotent: false };
  }

  if (isUniqueViolation(insErr)) {
    const { data: existing, error: selErr } = await db
      .from('task_completions')
      .select('*')
      .eq('task_id', req.task_id)
      .eq('local_date', localDate)
      .maybeSingle();
    if (selErr || !existing) {
      throw new ApiError('INTERNAL', 'Failed to load existing completion');
    }
    return { completion: TaskCompletion.parse(existing), idempotent: true };
  }

  throw new ApiError('INTERNAL', insErr?.message ?? 'Failed to insert completion');
}

export async function listTaskCompletions(
  db: SupabaseClient,
  ctx: RequestCtx & { family_id: string; timezone: string | null },
  req: TaskCompletionsListQuery,
  now: Date,
): Promise<TaskCompletion[]> {
  const tz = ctx.timezone ?? 'UTC';
  const localDate = req.local_date ?? todayYmdInTz(tz, now);

  const { data: child, error: cErr } = await db
    .from('children')
    .select('id')
    .eq('id', req.child_id)
    .eq('family_id', ctx.family_id)
    .maybeSingle();
  if (cErr) {
    throw new ApiError('INTERNAL', 'Failed to verify child');
  }
  if (!child) {
    throw new ApiError('FORBIDDEN', 'Child is not in your family');
  }

  const { data, error } = await db
    .from('task_completions')
    .select('*')
    .eq('child_id', req.child_id)
    .eq('local_date', localDate);
  if (error) {
    throw new ApiError('INTERNAL', 'Failed to list completions');
  }
  return (data ?? []).map((row) => TaskCompletion.parse(row));
}
