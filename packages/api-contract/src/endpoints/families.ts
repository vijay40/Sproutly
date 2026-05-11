import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { Uuid } from '../schemas/common.js';

export const CreateFamilyRequest = z.object({
  timezone: z.string().min(1),
});

export type CreateFamilyRequest = z.infer<typeof CreateFamilyRequest>;

export const CreateFamilyResponse = z.object({
  id: Uuid,
  parent_user_id: Uuid,
  timezone: z.string(),
  created_at: z.string(),
});

export type CreateFamilyResponse = z.infer<typeof CreateFamilyResponse>;

export function registerFamilies(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'post',
    path: '/families',
    summary: 'Bootstrap the family row for the signed-in parent',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { 'application/json': { schema: CreateFamilyRequest } },
      },
    },
    responses: {
      201: {
        description: 'Created',
        content: { 'application/json': { schema: CreateFamilyResponse } },
      },
      409: {
        description: 'Family already exists for this parent',
      },
    },
  });
}
