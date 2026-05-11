import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { LocalDate, Uuid } from '../schemas/common.js';

export const DailySummary = z.object({
  child_id: Uuid,
  local_date: LocalDate,
  total_tasks: z.number().int(),
  completed_tasks: z.number().int(),
  was_successful: z.boolean(),
  simplified_from_miss: z.boolean(),
});

export type DailySummary = z.infer<typeof DailySummary>;

export const DailySummariesListResponse = z.array(DailySummary);
export type DailySummariesListResponse = z.infer<typeof DailySummariesListResponse>;

export const DailySummariesListQuery = z
  .object({
    from: LocalDate.optional(),
    to: LocalDate.optional(),
    child_id: Uuid,
  })
  .strict()
  .refine(
    (q) => {
      if (q.from && q.to && q.from > q.to) return false;
      return true;
    },
    { message: 'from must be <= to', path: ['from'] },
  )
  .refine(
    (q) => {
      if (!q.from || !q.to) return true;
      const a = new Date(q.from + 'T00:00:00Z');
      const b = new Date(q.to + 'T00:00:00Z');
      const days = (b.getTime() - a.getTime()) / (86400 * 1000);
      return days <= 90;
    },
    { message: 'range must be at most 90 days', path: ['to'] },
  );

export type DailySummariesListQuery = z.infer<typeof DailySummariesListQuery>;

export function registerDailySummaries(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/daily-summaries',
    summary: 'List daily summaries for a child',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: DailySummariesListResponse } },
      },
    },
  });
}
