import { describe, expect, it, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { setDbForTests } from '../src/db/client.js';

const secret = 'tasks-test-secret';
const uid = '11111111-1111-4111-8111-111111111111';
const famId = '22222222-2222-4222-8222-222222222222';
const childId = '33333333-3333-4333-8333-333333333333';

function bearer(): string {
  return `Bearer ${jwt.sign({ sub: uid, role: 'authenticated' }, secret, { algorithm: 'HS256' })}`;
}

const taskRow = {
  id: '44444444-4444-4444-8444-444444444444',
  child_id: childId,
  title: 'Brush teeth',
  icon: null,
  category: 'routine',
  time_slot: 'morning',
  difficulty: 1,
  recurrence: 'daily',
  recurrence_days: null,
  is_bonus: false,
  is_active: true,
  created_at: '2026-05-01T12:00:00.000Z',
};

function mockDb(opts: { family: { id: string; timezone: string } | null; childIds?: string[]; tasks?: unknown[] }) {
  const childIds = opts.childIds ?? [childId];
  const tasks = opts.tasks ?? [taskRow];
  return {
    from(table: string) {
      if (table === 'families') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.family, error: null }),
            }),
          }),
        };
      }
      if (table === 'children') {
        return {
          select: () => ({
            eq: (col: string) => {
              if (col === 'family_id') {
                return Promise.resolve({
                  data: childIds.map((id) => ({ id })),
                  error: null,
                });
              }
              return {
                maybeSingle: async () => ({
                  data: { id: childId, family_id: famId },
                  error: null,
                }),
              };
            },
          }),
        };
      }
      if (table === 'tasks') {
        return {
          select: () => ({
            in: () => ({
              eq: () => ({
                eq: () => ({
                  order: async () => ({ data: tasks, error: null }),
                }),
                order: async () => ({ data: tasks, error: null }),
              }),
              order: async () => ({ data: tasks, error: null }),
            }),
            eq: () => ({
              maybeSingle: async () => ({ data: taskRow, error: null }),
            }),
            order: async () => ({ data: tasks, error: null }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: taskRow, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: { ...taskRow, title: 'Updated' }, error: null }),
                }),
              }),
              select: () => ({
                single: async () => ({ data: { ...taskRow, is_active: false }, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected ${table}`);
    },
  } as import('@supabase/supabase-js').SupabaseClient;
}

describe('/tasks', () => {
  beforeEach(() => {
    process.env.VITEST = 'true';
    process.env.SUPABASE_JWT_SECRET = secret;
    setDbForTests(null);
    vi.restoreAllMocks();
  });

  it('GET returns 401 without token', async () => {
    const app = createApp();
    const res = await app.request('http://test/tasks');
    expect(res.status).toBe(401);
  });

  it('GET returns tasks for family', async () => {
    setDbForTests(
      mockDb({
        family: { id: famId, timezone: 'America/Los_Angeles' },
      }),
    );
    const app = createApp();
    const res = await app.request('http://test/tasks', { headers: { Authorization: bearer() } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].title).toBe('Brush teeth');
  });
});
