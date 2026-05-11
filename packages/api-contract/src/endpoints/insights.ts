import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { Iso8601, Uuid } from '../schemas/common.js';

export const Insight = z.object({
  id: Uuid,
  family_id: Uuid,
  insight_text: z.string(),
  suggestion_type: z
    .enum(['difficulty_up', 'difficulty_down', 'reschedule', 'break_task', 'simplify_tomorrow', 'generic'])
    .nullable(),
  task_id: Uuid.nullable(),
  is_applied: z.boolean(),
  is_dismissed: z.boolean(),
  generated_at: Iso8601,
  passed_safety_filter: z.boolean(),
});

export type Insight = z.infer<typeof Insight>;

export const InsightsListResponse = z.array(Insight);
export type InsightsListResponse = z.infer<typeof InsightsListResponse>;

export const InsightsListQuery = z.object({
  state: z.enum(['active', 'applied', 'dismissed', 'all']).optional(),
});

export type InsightsListQuery = z.infer<typeof InsightsListQuery>;

export function registerInsights(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/insights',
    summary: 'List AI insights for the family',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: InsightsListResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/insights/{id}/apply',
    summary: 'Mark insight as applied (idempotent)',
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: Uuid }) },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: Insight } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/insights/{id}/dismiss',
    summary: 'Mark insight as dismissed (idempotent)',
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: Uuid }) },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: Insight } },
      },
    },
  });
}
