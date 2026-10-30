import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { Iso8601, LocalDate, Uuid } from '../schemas/common.js';

export const TaskCompletion = z.object({
  id: Uuid,
  task_id: Uuid,
  child_id: Uuid,
  local_date: LocalDate,
  completed_at: Iso8601,
  marked_by_parent: z.boolean(),
});

export type TaskCompletion = z.infer<typeof TaskCompletion>;

export const CreateTaskCompletionRequest = z
  .object({
    task_id: Uuid,
    child_id: Uuid,
    local_date: LocalDate.optional(),
  })
  .strict();

export type CreateTaskCompletionRequest = z.infer<typeof CreateTaskCompletionRequest>;

export const CreateTaskCompletionResponse = z.object({
  completion: TaskCompletion,
  idempotent: z.boolean(),
});

export type CreateTaskCompletionResponse = z.infer<typeof CreateTaskCompletionResponse>;

export const TaskCompletionsListQuery = z.object({
  child_id: Uuid,
  local_date: LocalDate.optional(),
});

export type TaskCompletionsListQuery = z.infer<typeof TaskCompletionsListQuery>;

export const TaskCompletionsListResponse = z.array(TaskCompletion);
export type TaskCompletionsListResponse = z.infer<typeof TaskCompletionsListResponse>;

export const DeleteTaskCompletionResponse = z.object({
  deleted: z.boolean(),
});

export type DeleteTaskCompletionResponse = z.infer<typeof DeleteTaskCompletionResponse>;

export function registerTaskCompletions(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'post',
    path: '/task-completions',
    summary: 'Mark task complete for a local date (idempotent)',
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: CreateTaskCompletionRequest } } },
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: CreateTaskCompletionResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/task-completions',
    summary: 'List task completions for a child on a local date',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: TaskCompletionsListResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/task-completions/{id}',
    summary: 'Undo a task completion by id (parent only)',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: Uuid }),
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: DeleteTaskCompletionResponse } },
      },
    },
  });
}
