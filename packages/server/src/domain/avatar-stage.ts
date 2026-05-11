import { ApiError } from '@sproutly/api-contract';

/** V1: same stage or advance by exactly one (stages 1–5). */
export function assertAvatarStagePatch(current: number, requested: number): void {
  if (requested === current) return;
  if (requested === current + 1 && requested <= 5) return;
  throw new ApiError('VALIDATION', 'Invalid avatar_stage transition');
}
