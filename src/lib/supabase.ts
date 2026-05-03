import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getKidToken } from './secureStore';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

let parentClient: SupabaseClient | null = null;
let kidClient: SupabaseClient | null = null;

export function getParentClient(): SupabaseClient {
  if (!parentClient) {
    parentClient = createClient(URL, ANON, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return parentClient;
}

export async function getKidClient(): Promise<SupabaseClient> {
  if (kidClient) return kidClient;
  const token = await getKidToken();
  kidClient = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
  return kidClient;
}

export function resetClients(): void {
  parentClient = null;
  kidClient = null;
}
