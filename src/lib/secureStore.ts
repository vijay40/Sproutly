import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'kid.device_token';
const CHILD_KEY = 'kid.child_id';

export async function saveKidAuth(token: string, childId: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(CHILD_KEY, childId);
}

export async function getKidToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getKidChildId(): Promise<string | null> {
  return SecureStore.getItemAsync(CHILD_KEY);
}

export async function clearKidAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(CHILD_KEY);
}
