import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    getItemAsync: vi.fn(async (k: string) => store.get(k) ?? null),
    deleteItemAsync: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    __reset: () => store.clear(),
  };
});
import * as SecureStore from 'expo-secure-store';
import {
  setPin,
  verifyPin,
  clearPin,
  hasPin,
  getPin,
  recordFailure,
  clearFailures,
  lockoutMsRemaining,
} from './kidLock';

beforeEach(() => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
});

describe('kidLock PIN', () => {
  it('verifies the same PIN after setPin', async () => {
    await setPin('1234');
    expect(await verifyPin('1234')).toBe(true);
    expect(await verifyPin('9999')).toBe(false);
  });
  it('hasPin reflects state', async () => {
    expect(await hasPin()).toBe(false);
    await setPin('1111');
    expect(await hasPin()).toBe(true);
    await clearPin();
    expect(await hasPin()).toBe(false);
  });
  it('getPin returns the stored value or null', async () => {
    expect(await getPin()).toBeNull();
    await setPin('5678');
    expect(await getPin()).toBe('5678');
    await clearPin();
    expect(await getPin()).toBeNull();
  });
});

describe('kidLock lockout', () => {
  it('no lockout until 3 failures', async () => {
    await recordFailure();
    await recordFailure();
    expect(await lockoutMsRemaining()).toBe(0);
  });
  it('30s lockout at 3 failures', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    await recordFailure();
    await recordFailure();
    await recordFailure();
    const ms = await lockoutMsRemaining();
    expect(ms).toBeGreaterThan(29_000);
    expect(ms).toBeLessThanOrEqual(30_000);
    vi.useRealTimers();
  });
  it('clearFailures resets', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    await recordFailure();
    await recordFailure();
    await recordFailure();
    await clearFailures();
    expect(await lockoutMsRemaining()).toBe(0);
    vi.useRealTimers();
  });
});
