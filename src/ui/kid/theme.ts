export const slotGradients = {
  default:   { from: '#F2EDFF', to: '#FFF5FA' },
  morning:   { from: '#FFF5E6', to: '#FFE9E0' },
  afternoon: { from: '#F2EDFF', to: '#EFE7FF' },
  evening:   { from: '#E0F2F1', to: '#D0E4F7' },
} as const;

export const slotIconBg = {
  morning:   '#D6ECFF',
  afternoon: '#E0D4FF',
  evening:   '#FFE2CC',
} as const;

export interface BlobSpec {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
}

export const blobs: readonly BlobSpec[] = [
  { x: -50,  y: -70, size: 220, color: '#E9DCFF', opacity: 0.6 },
  { x: 990,  y: 620, size: 280, color: '#FFE2EC', opacity: 0.6 },
  { x: 1090, y: 80,  size: 90,  color: '#FFD7A8', opacity: 0.6 },
];

export const orb = {
  size: 420,
  shadow: { offsetY: 8, radius: 28, color: 'rgba(0,0,0,0.06)' },
} as const;

export const kidInk = '#24252C';
export const kidMuted = '#6E6A7C';
export const kidPurple = '#5F33E1';
export const kidPurpleWash = '#EDE8FF';
export const kidWhite = '#FFFFFF';

/** iPad frame dimensions (Figma). */
export const FRAME_W = 1194;
export const FRAME_H = 834;

/**
 * Avatar stage → emoji / display name. Keyed by derived stage (1–5) from successful_days.
 * The child's avatar is always derived from their current stage — never from
 * a free-form `avatar_emoji` field.
 */
export const STAGE_EMOJI = ['🥚', '🐣', '🐴', '✨', '🦄', '🌟'] as const;
/** Indices 1–5 match derived stage from successful_days. Aligns with K3-Phone · Today Figma chip labels. */
export const STAGE_NAMES = ['Egg', 'Egg', 'Foal', 'Sparky', 'Unicorn', 'Alicorn'] as const;

export function stageEmoji(stage: number): string {
  return STAGE_EMOJI[stage] ?? STAGE_EMOJI[STAGE_EMOJI.length - 1];
}

export function stageName(stage: number): string {
  return STAGE_NAMES[stage] ?? STAGE_NAMES[STAGE_NAMES.length - 1];
}
