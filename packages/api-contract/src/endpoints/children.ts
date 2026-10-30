import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { Iso8601, LocalDate, Uuid } from '../schemas/common.js';

export const Child = z.object({
  id: Uuid,
  family_id: Uuid,
  name: z.string(),
  age: z.number().int().nullable(),
  avatar_emoji: z.string().nullable(),
  successful_days: z.number().int(),
  last_evaluated_date: LocalDate.nullable(),
  pending_stage_transition: z.boolean(),
  created_at: Iso8601,
});

export type Child = z.infer<typeof Child>;

export const ChildrenListResponse = z.array(Child);
export type ChildrenListResponse = z.infer<typeof ChildrenListResponse>;

export const CreateChildRequest = z
  .object({
    name: z.string().min(1),
    age: z.number().int().min(3).max(12).optional(),
    avatar_emoji: z.string().optional(),
  })
  .strict();

export type CreateChildRequest = z.infer<typeof CreateChildRequest>;

export const UpdateChildRequest = z
  .object({
    name: z.string().min(1).optional(),
    age: z.number().int().min(3).max(12).nullable().optional(),
    avatar_emoji: z.string().nullable().optional(),
  })
  .strict();

export type UpdateChildRequest = z.infer<typeof UpdateChildRequest>;

export function registerChildren(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/children',
    summary: 'List children in the current family',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: ChildrenListResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/children',
    summary: 'Create a child (V1: one child per family)',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateChildRequest,
            examples: {
              default: { value: { name: 'Alex', age: 7 } },
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Created',
        content: { 'application/json': { schema: Child } },
      },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/children/{id}',
    summary: 'Partially update a child',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: Uuid }),
      body: {
        content: {
          'application/json': {
            schema: UpdateChildRequest,
            examples: {
              name: { value: { name: 'Alex' } },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: Child } },
      },
    },
  });
}
