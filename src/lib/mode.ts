import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'app.mode';
export type AppMode = 'parent' | 'kid';

export async function getMode(): Promise<AppMode | null> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'parent' || v === 'kid' ? v : null;
}

export async function setMode(mode: AppMode): Promise<void> {
  await AsyncStorage.setItem(KEY, mode);
}

export async function clearMode(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
