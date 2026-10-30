/** Which bundled PNG (1–5) to show; unknown / pre-stage → 4 (last full-unicorn fallback). */
export function resolveStageAvatarAssetStage(stage: number): 1 | 2 | 3 | 4 | 5 {
  const s = Math.trunc(stage);
  if (s === 1 || s === 2 || s === 3 || s === 4 || s === 5) return s;
  return 4;
}
