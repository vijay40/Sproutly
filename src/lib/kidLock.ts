import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'kid.lock.pin';
const FAILURES_KEY = 'kid.lock.failures';
const LOCKOUT_UNTIL_KEY = 'kid.lock.lockout_until';

const LOCKOUT_MS = 30_000;

export async function setPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function hasPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return !!stored;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return !!stored && stored === pin;
}

/** Returns the current PIN, or null if none set. Used by the "Show PIN" toggle in parent settings. */
export async function getPin(): Promise<string | null> {
  return SecureStore.getItemAsync(PIN_KEY);
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
}

export async function recordFailure(): Promise<void> {
  const raw = await SecureStore.getItemAsync(FAILURES_KEY);
  const n = raw ? Number.parseInt(raw, 10) || 0 : 0;
  const next = n + 1;
  if (next >= 3) {
    const until = String(Date.now() + LOCKOUT_MS);
    await SecureStore.setItemAsync(LOCKOUT_UNTIL_KEY, until);
    await SecureStore.deleteItemAsync(FAILURES_KEY);
  } else {
    await SecureStore.setItemAsync(FAILURES_KEY, String(next));
  }
}

export async function clearFailures(): Promise<void> {
  await SecureStore.deleteItemAsync(FAILURES_KEY);
  await SecureStore.deleteItemAsync(LOCKOUT_UNTIL_KEY);
}

export async function lockoutMsRemaining(): Promise<number> {
  const raw = await SecureStore.getItemAsync(LOCKOUT_UNTIL_KEY);
  if (!raw) return 0;
  const until = Number.parseInt(raw, 10);
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, until - Date.now());
}

/** Consecutive wrong PIN attempts since last success or lockout (0–2). */
export async function failureCount(): Promise<number> {
  const raw = await SecureStore.getItemAsync(FAILURES_KEY);
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}
