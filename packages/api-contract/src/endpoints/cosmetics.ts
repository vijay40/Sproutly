import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

export const Cosmetic = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['horn', 'mane', 'background']),
  asset_path: z.string(),
});

export type Cosmetic = z.infer<typeof Cosmetic>;

export const CosmeticsListResponse = z.array(Cosmetic);
export type CosmeticsListResponse = z.infer<typeof CosmeticsListResponse>;

export function registerCosmetics(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/cosmetics',
    summary: 'List cosmetics catalog',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: CosmeticsListResponse } },
      },
    },
  });
}
