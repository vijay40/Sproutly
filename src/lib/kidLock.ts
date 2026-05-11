import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const HASH_KEY = 'kid.lock.hash';
const SALT_KEY = 'kid.lock.salt';

async function randomSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hash(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

export async function setPin(pin: string): Promise<void> {
  const salt = await randomSalt();
  const h = await hash(pin, salt);
  await SecureStore.setItemAsync(SALT_KEY, salt);
  await SecureStore.setItemAsync(HASH_KEY, h);
}

export async function hasPin(): Promise<boolean> {
  const h = await SecureStore.getItemAsync(HASH_KEY);
  return !!h;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(SALT_KEY);
  const stored = await SecureStore.getItemAsync(HASH_KEY);
  if (!salt || !stored) return false;
  const h = await hash(pin, salt);
  return h === stored;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(HASH_KEY);
  await SecureStore.deleteItemAsync(SALT_KEY);
}
