import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

export const GetHealthResponse = z.object({
  ok: z.literal(true),
  version: z.string(),
});

export type GetHealthResponse = z.infer<typeof GetHealthResponse>;

export function registerHealth(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/health',
    summary: 'Health check',
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: GetHealthResponse } },
      },
    },
  });
}
