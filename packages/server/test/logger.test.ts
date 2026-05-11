import { describe, expect, it } from 'vitest';
import { getLoggerTransportTypes } from '../src/logger.js';

describe('logger', () => {
  it('does not attach DailyRotateFile under Vitest', () => {
    expect(process.env.VITEST).toBe('true');
    const names = getLoggerTransportTypes();
    expect(names.some((n) => n.includes('DailyRotate'))).toBe(false);
    expect(names).toContain('Console');
  });
});
