/** Stage thresholds after increment: 7→2, 14→3, 21→4, 30→5. */
function targetStageFromSuccessfulDays(sd: number): number | undefined {
  if (sd >= 30) return 5;
  if (sd >= 21) return 4;
  if (sd >= 14) return 3;
  if (sd >= 7) return 2;
  return undefined;
}

/** Current avatar stage derived from `children.successful_days` (1–5). */
export function stageFromSuccessfulDays(successfulDays: number): number {
  return targetStageFromSuccessfulDays(successfulDays) ?? 1;
}
