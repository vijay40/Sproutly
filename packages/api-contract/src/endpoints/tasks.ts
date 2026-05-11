import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { Iso8601, Uuid } from '../schemas/common.js';

export const Recurrence = z.enum(['daily', 'weekdays', 'custom', 'one_time']);
export type Recurrence = z.infer<typeof Recurrence>;

export const Task = z.object({
  id: Uuid,
  child_id: Uuid,
  title: z.string(),
  icon: z.string().nullable(),
  category: z.enum(['routine', 'chore', 'behavior']),
  time_slot: z.enum(['morning', 'afternoon', 'evening']),
  difficulty: z.number().int().min(1).max(3),
  recurrence: Recurrence,
  recurrence_days: z.array(z.number().int()).nullable(),
  is_bonus: z.boolean(),
  bonus_cosmetic_id: z.string().nullable(),
  is_active: z.boolean(),
  created_at: Iso8601,
});

export type Task = z.infer<typeof Task>;

export const TasksListResponse = z.array(Task);
export type TasksListResponse = z.infer<typeof TasksListResponse>;

export const TasksListQuery = z.object({
  is_active: z.enum(['true', 'false', 'all']).optional(),
  is_bonus: z.enum(['true', 'false']).optional(),
  child_id: Uuid.optional(),
});

export type TasksListQuery = z.infer<typeof TasksListQuery>;

const customRecurrenceOk = (d: {
  recurrence: Recurrence;
  recurrence_days?: number[] | null;
}): boolean =>
  d.recurrence !== 'custom' || (!!d.recurrence_days && d.recurrence_days.length > 0);

export const CreateTaskRequest = z
  .object({
    child_id: Uuid,
    title: z.string().min(1),
    category: z.enum(['routine', 'chore', 'behavior']),
    time_slot: z.enum(['morning', 'afternoon', 'evening']),
    recurrence: Recurrence,
    icon: z.string().nullable().optional(),
    difficulty: z.number().int().min(1).max(3).optional(),
    recurrence_days: z.array(z.number().int()).nullable().optional(),
    is_bonus: z.boolean().optional(),
    bonus_cosmetic_id: z.string().nullable().optional(),
  })
  .strict()
  .refine(customRecurrenceOk, {
    message: 'recurrence_days required and non-empty when recurrence is custom',
    path: ['recurrence_days'],
  });

export type CreateTaskRequest = z.infer<typeof CreateTaskRequest>;

export const UpdateTaskRequest = z
  .object({
    title: z.string().min(1).optional(),
    category: z.enum(['routine', 'chore', 'behavior']).optional(),
    time_slot: z.enum(['morning', 'afternoon', 'evening']).optional(),
    recurrence: Recurrence.optional(),
    icon: z.string().nullable().optional(),
    difficulty: z.number().int().min(1).max(3).optional(),
    recurrence_days: z.array(z.number().int()).nullable().optional(),
    is_bonus: z.boolean().optional(),
    bonus_cosmetic_id: z.string().nullable().optional(),
  })
  .strict()
  .refine(
    (d) => {
      if (d.recurrence === undefined) return true;
      return customRecurrenceOk({
        recurrence: d.recurrence,
        recurrence_days: d.recurrence_days,
      });
    },
    {
      message: 'recurrence_days required and non-empty when recurrence is custom',
      path: ['recurrence_days'],
    },
  );

export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequest>;

export function registerTasks(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/tasks',
    summary: 'List tasks for the current family',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: TasksListResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/tasks',
    summary: 'Create a task',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { 'application/json': { schema: CreateTaskRequest } },
      },
    },
    responses: {
      201: {
        description: 'Created',
        content: { 'application/json': { schema: Task } },
      },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/tasks/{id}',
    summary: 'Update a task',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: Uuid }),
      body: { content: { 'application/json': { schema: UpdateTaskRequest } } },
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: Task } },
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/tasks/{id}',
    summary: 'Soft-delete a task (sets is_active=false)',
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: Uuid }) },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: Task } },
      },
    },
  });
}
