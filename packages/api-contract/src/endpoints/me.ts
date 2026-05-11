import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { Uuid } from '../schemas/common.js';

/** `family_id` / `timezone` are null until a `families` row exists; `has_onboarded` means ≥1 child. */
export const GetMeResponse = z.object({
  user_id: Uuid,
  family_id: Uuid.nullable(),
  timezone: z.string().nullable(),
  has_onboarded: z.boolean(),
});

export type GetMeResponse = z.infer<typeof GetMeResponse>;

export const PatchMeRequest = z
  .object({
    timezone: z.string().min(1),
  })
  .partial();

export type PatchMeRequest = z.infer<typeof PatchMeRequest>;

export const PatchMeResponse = GetMeResponse;
export type PatchMeResponse = z.infer<typeof PatchMeResponse>;

export function registerMe(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/me',
    summary: 'Current parent profile',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: GetMeResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/me',
    summary: 'Update current parent profile',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { 'application/json': { schema: PatchMeRequest } },
      },
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: PatchMeResponse } },
      },
    },
  });
}
