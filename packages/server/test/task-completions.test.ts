import { describe, expect, it, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { setDbForTests } from '../src/db/client.js';
import { createTaskCompletion, listTaskCompletions } from '../src/services/task-completions.js';
import type { SupabaseClient } from '@supabase/supabase-js';

const secret = 'tc-test-secret';
const uid = '11111111-1111-4111-8111-111111111111';
const famId = '22222222-2222-4222-8222-222222222222';
const childId = '33333333-3333-4333-8333-333333333333';
const taskId = '44444444-4444-4444-8444-444444444444';

function bearer(): string {
  return `Bearer ${jwt.sign({ sub: uid, role: 'authenticated' }, secret, { algorithm: 'HS256' })}`;
}

const ctx = {
  user_id: uid,
  family_id: famId,
  timezone: 'America/Los_Angeles',
};

const fixedNow = new Date('2026-05-11T18:00:00.000Z');

describe('createTaskCompletion (service)', () => {
  it('rejects child in another family', async () => {
    const db = {
      from() {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;
    await expect(
      createTaskCompletion(
        db,
        ctx,
        { task_id: taskId, child_id: childId },
        fixedNow,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('fills local_date from family today and inserts', async () => {
    const db = {
      from(table: string) {
        if (table === 'children') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: childId, family_id: famId }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: taskId, child_id: childId }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'task_completions') {
          return {
            insert: () => ({
              select: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                    task_id: taskId,
                    child_id: childId,
                    local_date: '2026-05-11',
                    completed_at: '2026-05-11T12:00:00.000+00:00',
                    marked_by_parent: true,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as SupabaseClient;
    const out = await createTaskCompletion(db, ctx, { task_id: taskId, child_id: childId }, fixedNow);
    expect(out.idempotent).toBe(false);
    expect(out.completion.local_date).toBe('2026-05-11');
  });

  it('rejects local_date two days ahead', async () => {
    const db = {
      from() {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: childId, family_id: famId }, error: null }),
              }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;
    await expect(
      createTaskCompletion(
        db,
        ctx,
        { task_id: taskId, child_id: childId, local_date: '2026-05-14' },
        fixedNow,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('idempotent on unique conflict', async () => {
    let insertCount = 0;
    const existing = {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      task_id: taskId,
      child_id: childId,
      local_date: '2026-05-11',
      completed_at: '2026-05-11T12:00:00.000+00:00',
      marked_by_parent: true,
    };
    const db = {
      from(table: string) {
        if (table === 'children' || table === 'tasks') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () =>
                    table === 'children'
                      ? { data: { id: childId, family_id: famId }, error: null }
                      : { data: { id: taskId, child_id: childId }, error: null },
                }),
              }),
            }),
          };
        }
        if (table === 'task_completions') {
          return {
            insert: () => ({
              select: () => ({
                maybeSingle: async () => {
                  insertCount += 1;
                  if (insertCount === 1) {
                    return { data: existing, error: null };
                  }
                  return { data: null, error: { code: '23505' } };
                },
              }),
            }),
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: existing, error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as SupabaseClient;
    const first = await createTaskCompletion(db, ctx, { task_id: taskId, child_id: childId }, fixedNow);
    expect(first.idempotent).toBe(false);
    const second = await createTaskCompletion(db, ctx, { task_id: taskId, child_id: childId }, fixedNow);
    expect(second.idempotent).toBe(true);
    expect(second.completion.id).toBe(existing.id);
  });
});

describe('listTaskCompletions (service)', () => {
  it('403 wrong family child', async () => {
    const db = {
      from() {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;
    await expect(listTaskCompletions(db, ctx, { child_id: childId }, fixedNow)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('/task-completions routes', () => {
  beforeEach(() => {
    process.env.VITEST = 'true';
    process.env.SUPABASE_JWT_SECRET = secret;
    setDbForTests(null);
    vi.restoreAllMocks();
  });

  it('401 POST without token', async () => {
    const app = createApp();
    const res = await app.request('http://test/task-completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, child_id: childId }),
    });
    expect(res.status).toBe(401);
  });

  it('401 GET without token', async () => {
    const app = createApp();
    const res = await app.request(`http://test/task-completions?child_id=${childId}`);
    expect(res.status).toBe(401);
  });
});
