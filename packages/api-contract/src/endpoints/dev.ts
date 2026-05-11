import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

export const ImpersonateRequest = z.object({
  email: z.string().email(),
});

export type ImpersonateRequest = z.infer<typeof ImpersonateRequest>;

export const ImpersonateResponse = z.object({
  access_token: z.string(),
  expires_at: z.string().datetime({ offset: true }),
});

export type ImpersonateResponse = z.infer<typeof ImpersonateResponse>;

export function registerDev(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'post',
    path: '/dev/impersonate',
    summary: 'Mint a dev-only access token (non-production only)',
    request: {
      body: {
        content: { 'application/json': { schema: ImpersonateRequest } },
      },
    },
    responses: {
      200: {
        description: 'Token issued',
        content: { 'application/json': { schema: ImpersonateResponse } },
      },
    },
  });
}
