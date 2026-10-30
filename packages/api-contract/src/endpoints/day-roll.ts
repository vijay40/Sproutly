import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { LocalDate, Uuid } from '../schemas/common.js';

export const DayRollRequest = z
  .object({
    child_id: Uuid.optional(),
    evaluate_today: z.boolean().optional(),
    clear_pending_stage_transition: z.boolean().optional(),
  })
  .strict();

export type DayRollRequest = z.infer<typeof DayRollRequest>;

export const DayRollSummary = z.object({
  child_id: Uuid,
  local_date: LocalDate,
  total_tasks: z.number().int(),
  completed_tasks: z.number().int(),
  was_successful: z.boolean(),
  stage_bumped: z.boolean(),
  new_stage: z.number().int(),
  miss_simplify_draft_id: Uuid.nullable(),
});

export type DayRollSummary = z.infer<typeof DayRollSummary>;

export const DayRollResponse = z.object({
  rolled: z.boolean(),
  today_local_date: LocalDate,
  summaries: z.array(DayRollSummary),
  reason: z.enum(['no_children']).optional(),
});

export type DayRollResponse = z.infer<typeof DayRollResponse>;

export function registerDayRoll(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'post',
    path: '/day-roll',
    summary: 'Run lazy day-roll catch-up through yesterday; optional evaluate_today for same-day evolution',
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: DayRollRequest } } },
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: DayRollResponse } },
      },
    },
  });
}
