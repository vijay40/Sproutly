import { describe, expect, it, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { setDbForTests } from '../src/db/client.js';
import { runDayRollForFamily } from '../src/services/day-roll.js';
import type { SupabaseClient } from '@supabase/supabase-js';

const secret = 'dr-test-secret';
const uid = '11111111-1111-4111-8111-111111111111';
const famId = '22222222-2222-4222-8222-222222222222';
const childId = '33333333-3333-4333-8333-333333333333';
const taskId = '44444444-4444-4444-8444-444444444444';

const ctx = {
  user_id: uid,
  family_id: famId,
  timezone: 'America/Los_Angeles',
};

const fixedNow = new Date('2026-05-11T18:00:00.000Z'); // 2026-05-11 in LA

describe('runDayRollForFamily evaluate_today', () => {
  it('bumps stage and successful_days for today when all tasks complete', async () => {
    let childRow = {
      id: childId,
      family_id: famId,
      name: 'Kid',
      successful_days: 6,
      last_evaluated_date: '2026-05-10',
      pending_stage_transition: false,
    };
    const updates: Record<string, unknown>[] = [];

    const db = {
      from(table: string) {
        if (table === 'children') {
          const chain = {
            _idFilter: null as string | null,
            select: () => chain,
            eq: (col: string, val: string) => {
              if (col === 'id') chain._idFilter = val;
              return chain;
            },
            maybeSingle: async () => ({ data: childRow, error: null }),
            then: (resolve: (v: { data: typeof childRow[]; error: null }) => void) => {
              const rows = chain._idFilter && chain._idFilter !== childId ? [] : [childRow];
              resolve({ data: rows, error: null });
            },
            update: (patch: Record<string, unknown>) => ({
              eq: () => ({
                or: () => ({
                  select: async () => {
                    updates.push(patch);
                    childRow = { ...childRow, ...patch };
                    return { data: [{ id: childId }], error: null };
                  },
                }),
                eq: async () => {
                  updates.push(patch);
                  childRow = { ...childRow, ...patch };
                  return { error: null };
                },
              }),
            }),
          };
          return chain;
        }
        if (table === 'tasks') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [
                    {
                      id: taskId,
                      child_id: childId,
                      is_active: true,
                      is_bonus: false,
                      time_slot: 'morning',
                      recurrence: 'daily',
                      created_at: '2026-05-01T12:00:00.000Z',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_completions') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', task_id: taskId }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'daily_summaries') {
          return {
            upsert: async () => ({ error: null }),
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as SupabaseClient;

    const out = await runDayRollForFamily(db, ctx, fixedNow, {
      child_id: childId,
      evaluate_today: true,
      clear_pending_stage_transition: true,
    });

    expect(out.rolled).toBe(true);
    expect(out.summaries).toHaveLength(1);
    expect(out.summaries[0]).toMatchObject({
      local_date: '2026-05-11',
      was_successful: true,
      stage_bumped: true,
      new_stage: 2,
    });
    expect(childRow.successful_days).toBe(7);
    expect(childRow.last_evaluated_date).toBe('2026-05-11');
    expect(childRow.pending_stage_transition).toBe(false);
  });

  it('re-evaluates today when last_evaluated_date is today but day was not successful', async () => {
    let childRow = {
      id: childId,
      family_id: famId,
      name: 'Kid',
      successful_days: 6,
      last_evaluated_date: '2026-05-11',
      pending_stage_transition: true,
    };

    const db = {
      from(table: string) {
        if (table === 'children') {
          const chain = {
            _idFilter: null as string | null,
            _skipOr: false,
            select: () => chain,
            eq: (col: string, val: string) => {
              if (col === 'id') chain._idFilter = val;
              return chain;
            },
            maybeSingle: async () => ({ data: childRow, error: null }),
            then: (resolve: (v: { data: typeof childRow[]; error: null }) => void) => {
              const rows = chain._idFilter && chain._idFilter !== childId ? [] : [childRow];
              resolve({ data: rows, error: null });
            },
            update: (patch: Record<string, unknown>) => ({
              eq: () => ({
                or: () => ({
                  select: async () => {
                    childRow = { ...childRow, ...patch };
                    return { data: [{ id: childId }], error: null };
                  },
                }),
                select: async () => {
                  childRow = { ...childRow, ...patch };
                  return { data: [{ id: childId }], error: null };
                },
                eq: async () => {
                  childRow = { ...childRow, ...patch };
                  return { error: null };
                },
              }),
            }),
          };
          return chain;
        }
        if (table === 'tasks') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [
                    {
                      id: taskId,
                      child_id: childId,
                      is_active: true,
                      is_bonus: false,
                      time_slot: 'morning',
                      recurrence: 'daily',
                      created_at: '2026-05-01T12:00:00.000Z',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_completions') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', task_id: taskId }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'daily_summaries') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { was_successful: false }, error: null }),
                }),
              }),
            }),
            upsert: async () => ({ error: null }),
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as SupabaseClient;

    const out = await runDayRollForFamily(db, ctx, fixedNow, {
      child_id: childId,
      evaluate_today: true,
    });

    expect(out.rolled).toBe(true);
    expect(out.summaries[0]).toMatchObject({
      local_date: '2026-05-11',
      was_successful: true,
      stage_bumped: true,
      new_stage: 2,
    });
    expect(childRow.successful_days).toBe(7);
    expect(childRow.pending_stage_transition).toBe(true);
  });

  it('re-syncs child when summary says successful but successful_days is stale', async () => {
    let childRow = {
      id: childId,
      family_id: famId,
      name: 'Kid',
      successful_days: 6,
      last_evaluated_date: '2026-05-11',
      pending_stage_transition: true,
    };

    const db = {
      from(table: string) {
        if (table === 'children') {
          const chain = {
            _idFilter: null as string | null,
            select: () => chain,
            eq: (col: string, val: string) => {
              if (col === 'id') chain._idFilter = val;
              return chain;
            },
            maybeSingle: async () => ({ data: childRow, error: null }),
            then: (resolve: (v: { data: typeof childRow[]; error: null }) => void) => {
              const rows = chain._idFilter && chain._idFilter !== childId ? [] : [childRow];
              resolve({ data: rows, error: null });
            },
            update: (patch: Record<string, unknown>) => ({
              eq: () => ({
                or: () => ({
                  select: async () => {
                    childRow = { ...childRow, ...patch };
                    return { data: [{ id: childId }], error: null };
                  },
                }),
                select: async () => {
                  childRow = { ...childRow, ...patch };
                  return { data: [{ id: childId }], error: null };
                },
                eq: async () => {
                  childRow = { ...childRow, ...patch };
                  return { error: null };
                },
              }),
            }),
          };
          return chain;
        }
        if (table === 'tasks') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [
                    {
                      id: taskId,
                      child_id: childId,
                      is_active: true,
                      is_bonus: false,
                      time_slot: 'morning',
                      recurrence: 'daily',
                      created_at: '2026-05-01T12:00:00.000Z',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_completions') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', task_id: taskId }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'daily_summaries') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { was_successful: true }, error: null }),
                }),
              }),
            }),
            upsert: async () => ({ error: null }),
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as SupabaseClient;

    const out = await runDayRollForFamily(db, ctx, fixedNow, {
      child_id: childId,
      evaluate_today: true,
    });

    expect(out.rolled).toBe(true);
    expect(out.summaries[0]).toMatchObject({
      local_date: '2026-05-11',
      was_successful: true,
      stage_bumped: true,
      new_stage: 2,
    });
    expect(childRow.successful_days).toBe(7);
    expect(childRow.pending_stage_transition).toBe(true);
  });
});

describe('POST /day-roll', () => {
  beforeEach(() => {
    process.env.VITEST = 'true';
    process.env.SUPABASE_JWT_SECRET = secret;
    setDbForTests(null);
    vi.restoreAllMocks();
  });

  it('returns 401 without token', async () => {
    const app = createApp();
    const res = await app.request('http://test/day-roll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});
