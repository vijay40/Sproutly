import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError, DayRollResponse, type DayRollSummary } from '@sproutly/api-contract';
import type { RequestCtx } from '../middleware/auth.js';
import { computeDayRoll, datesBetween } from '../domain/day-roll.js';
import { isTaskScheduledOn, type TaskRowLike } from '../domain/tasks.js';
import { todayYmdInTz, ymdAddDays } from '../lib/local-date.js';

dayjs.extend(utc);
dayjs.extend(timezone);

function localNoonInstant(localDate: string, tz: string): Date {
  return dayjs.tz(`${localDate}T12:00:00`, tz).toDate();
}

export type DayRollRunOptions = {
  child_id?: string;
  /** Bookkeep today's calendar date (family TZ) — used after same-day evolution video. */
  evaluate_today?: boolean;
  /** Clear pending_stage_transition after evolution has played (same-day or morning). */
  clear_pending_stage_transition?: boolean;
};

type RollChildForDateOpts = {
  /** When true, re-run today if last_evaluated_date equals date but day was not successful yet. */
  allowSameDayReevaluate?: boolean;
};

function childMatchesSuccessfulRoll(
  fresh: Record<string, unknown>,
  result: ReturnType<typeof computeDayRoll>,
): boolean {
  return (
    Number(fresh.successful_days) === result.next_successful_days &&
    Boolean(fresh.pending_stage_transition) === result.next_pending_stage_transition
  );
}

async function rollChildForDate(
  db: SupabaseClient,
  ctx: RequestCtx & { family_id: string; timezone: string },
  childId: string,
  date: string,
  today: string,
  tz: string,
  rollOpts?: RollChildForDateOpts,
): Promise<DayRollSummary | null> {
  const { data: fresh, error: freshErr } = await db
    .from('children')
    .select('*')
    .eq('id', childId)
    .maybeSingle();
  if (freshErr || !fresh) return null;
  const last = fresh.last_evaluated_date as string | null;

  if (last && last > date) {
    return null;
  }

  if (last && last === date && !rollOpts?.allowSameDayReevaluate) {
    return null;
  }

  const { data: taskRows, error: tErr } = await db
    .from('tasks')
    .select('*')
    .eq('child_id', childId)
    .eq('is_active', true);
  if (tErr) {
    throw new ApiError('INTERNAL', 'Failed to load tasks');
  }
  const instant = localNoonInstant(date, tz);
  const tasksAll = (taskRows ?? []) as TaskRowLike[];
  const tasksScheduled = tasksAll.filter((t) => isTaskScheduledOn(t, instant, tz));

  const { data: compRows, error: compErr } = await db
    .from('task_completions')
    .select('id, task_id')
    .eq('child_id', childId)
    .eq('local_date', date);
  if (compErr) {
    throw new ApiError('INTERNAL', 'Failed to load completions');
  }
  const completionsForDate = (compRows ?? []) as Array<{ id: string; task_id: string }>;

  const result = computeDayRoll({
    date,
    tasksScheduled: tasksScheduled.map((t) => ({
      id: t.id,
      time_slot: t.time_slot,
      is_bonus: t.is_bonus,
      is_active: t.is_active,
    })),
    completionsForDate,
    child: {
      successful_days: Number(fresh.successful_days),
      pending_stage_transition: Boolean(fresh.pending_stage_transition),
    },
  });

  let sameDayReeval = false;
  if (last && last === date && rollOpts?.allowSameDayReevaluate) {
    const { data: priorSummary, error: psErr } = await db
      .from('daily_summaries')
      .select('was_successful')
      .eq('child_id', childId)
      .eq('local_date', date)
      .maybeSingle();
    if (psErr) {
      throw new ApiError('INTERNAL', 'Failed to load daily summary');
    }
    if (
      priorSummary?.was_successful &&
      result.was_successful &&
      childMatchesSuccessfulRoll(fresh as Record<string, unknown>, result)
    ) {
      return null;
    }
    sameDayReeval = true;
  }

  const { error: sumErr } = await db.from('daily_summaries').upsert(
    {
      child_id: childId,
      local_date: date,
      total_tasks: result.total_tasks,
      completed_tasks: result.completed_tasks,
      was_successful: result.was_successful,
      simplified_from_miss: false,
    },
    { onConflict: 'child_id,local_date' },
  );
  if (sumErr) {
    throw new ApiError('INTERNAL', 'Failed to upsert daily summary');
  }

  const isToday = date === today;
  const updates: Record<string, unknown> = {};
  if (result.was_successful) {
    updates.last_evaluated_date = date;
    updates.successful_days = result.next_successful_days;
    updates.pending_stage_transition = result.next_pending_stage_transition;
  } else if (!isToday) {
    // Close out past calendar days even on a miss so catch-up does not loop.
    updates.last_evaluated_date = date;
  }

  let updatedRows: { id: string }[] | null = null;
  let upErr: { message: string } | null = null;
  if (Object.keys(updates).length > 0) {
    if (sameDayReeval) {
      ({ data: updatedRows, error: upErr } = await db
        .from('children')
        .update(updates)
        .eq('id', childId)
        .select('id'));
    } else {
      ({ data: updatedRows, error: upErr } = await db
        .from('children')
        .update(updates)
        .eq('id', childId)
        .or(`last_evaluated_date.is.null,last_evaluated_date.lt.${date}`)
        .select('id'));
    }
    if (upErr) {
      throw new ApiError('INTERNAL', 'Failed to update child after day-roll');
    }
    if (!updatedRows || updatedRows.length === 0) {
      return null;
    }
  }

  let missDraftId: string | null = null;
  if (result.missSimplifyDraft) {
    const childName = String(fresh.name ?? 'your child');
    const slot = result.missSimplifyDraft.worst_slot;
    const { data: ins, error: insErr } = await db
      .from('ai_insights')
      .insert({
        family_id: ctx.family_id,
        insight_text: `Try simplifying ${childName}'s ${slot} tomorrow.`,
        suggestion_type: 'simplify_tomorrow',
        task_id: null,
        is_applied: false,
        is_dismissed: false,
        passed_safety_filter: true,
      })
      .select('id')
      .single();
    if (!insErr && ins) {
      missDraftId = String((ins as { id: string }).id);
    }
  }

  return {
    child_id: childId,
    local_date: date,
    total_tasks: result.total_tasks,
    completed_tasks: result.completed_tasks,
    was_successful: result.was_successful,
    stage_bumped: result.stage_bumped,
    new_stage: result.next_stage,
    miss_simplify_draft_id: missDraftId,
  };
}

export async function runDayRollForFamily(
  db: SupabaseClient,
  ctx: RequestCtx & { family_id: string; timezone: string },
  now: Date,
  opts: DayRollRunOptions,
): Promise<DayRollResponse> {
  const tz = ctx.timezone;
  const today = todayYmdInTz(tz, now);
  const yesterday = ymdAddDays(today, -1, tz);

  let q = db.from('children').select('*').eq('family_id', ctx.family_id);
  if (opts.child_id) {
    q = q.eq('id', opts.child_id);
  }
  const { data: children, error: chErr } = await q;
  if (chErr) {
    throw new ApiError('INTERNAL', 'Failed to load children');
  }
  const list = children ?? [];
  if (opts.child_id && list.length === 0) {
    throw new ApiError('FORBIDDEN', 'Child is not in your family');
  }
  if (list.length === 0) {
    return DayRollResponse.parse({
      rolled: false,
      today_local_date: today,
      summaries: [],
      reason: 'no_children',
    });
  }

  const summaries: DayRollSummary[] = [];
  let rolled = false;

  for (const child of list as Array<Record<string, unknown>>) {
    const childId = String(child.id);
    const lastEval = (child.last_evaluated_date as string | null) ?? null;
    const datesToRoll = datesBetween(lastEval, yesterday, tz);

    for (const date of datesToRoll) {
      const summary = await rollChildForDate(db, ctx, childId, date, today, tz);
      if (summary) {
        rolled = true;
        summaries.push(summary);
      }
    }

    if (opts.evaluate_today) {
      const todaySummary = await rollChildForDate(db, ctx, childId, today, today, tz, {
        allowSameDayReevaluate: true,
      });
      if (todaySummary) {
        rolled = true;
        summaries.push(todaySummary);
      }
    }
  }

  if (opts.clear_pending_stage_transition && opts.child_id) {
    const { error: clearErr } = await db
      .from('children')
      .update({ pending_stage_transition: false })
      .eq('id', opts.child_id)
      .eq('family_id', ctx.family_id);
    if (clearErr) {
      throw new ApiError('INTERNAL', 'Failed to clear pending_stage_transition');
    }
  }

  return DayRollResponse.parse({
    rolled,
    today_local_date: today,
    summaries,
  });
}
