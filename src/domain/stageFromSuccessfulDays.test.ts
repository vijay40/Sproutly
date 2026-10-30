import { describe, expect, it } from 'vitest';
import { stageFromSuccessfulDays } from './stageFromSuccessfulDays';

describe('stageFromSuccessfulDays', () => {
  it('maps streak bands to stages 1–5', () => {
    expect(stageFromSuccessfulDays(0)).toBe(1);
    expect(stageFromSuccessfulDays(6)).toBe(1);
    expect(stageFromSuccessfulDays(7)).toBe(2);
    expect(stageFromSuccessfulDays(13)).toBe(2);
    expect(stageFromSuccessfulDays(14)).toBe(3);
    expect(stageFromSuccessfulDays(20)).toBe(3);
    expect(stageFromSuccessfulDays(21)).toBe(4);
    expect(stageFromSuccessfulDays(29)).toBe(4);
    expect(stageFromSuccessfulDays(30)).toBe(5);
    expect(stageFromSuccessfulDays(99)).toBe(5);
  });
});
