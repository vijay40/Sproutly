import { describe, expect, it } from 'vitest';
import { resolveStageAvatarAssetStage } from './stageAvatarAssetStage';

describe('resolveStageAvatarAssetStage', () => {
  it('maps stages 1–5 to themselves', () => {
    expect(resolveStageAvatarAssetStage(1)).toBe(1);
    expect(resolveStageAvatarAssetStage(2)).toBe(2);
    expect(resolveStageAvatarAssetStage(3)).toBe(3);
    expect(resolveStageAvatarAssetStage(4)).toBe(4);
    expect(resolveStageAvatarAssetStage(5)).toBe(5);
  });

  it('falls back to stage 4 for unknown or pre-stage indices', () => {
    expect(resolveStageAvatarAssetStage(0)).toBe(4);
    expect(resolveStageAvatarAssetStage(-1)).toBe(4);
    expect(resolveStageAvatarAssetStage(99)).toBe(4);
  });

  it('truncates toward zero for non-integer stages', () => {
    expect(resolveStageAvatarAssetStage(3.9)).toBe(3);
    expect(resolveStageAvatarAssetStage(5.1)).toBe(5);
  });
});
