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

/** Parse magic-link / OAuth redirect URL and persist session (custom scheme + URL fragment). */
export async function consumeAuthSessionFromUrl(url: string | null): Promise<void> {
  if (!url) return;
  const supabase = getParentClient();

  const hashIdx = url.indexOf('#');
  if (hashIdx !== -1) {
    const params = new URLSearchParams(url.slice(hashIdx + 1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
      return;
    }
  }

  const qIdx = url.indexOf('?');
  if (qIdx !== -1) {
    const queryEnd = url.indexOf('#', qIdx);
    const query = queryEnd === -1 ? url.slice(qIdx + 1) : url.slice(qIdx + 1, queryEnd);
    const params = new URLSearchParams(query);
    const code = params.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }
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
