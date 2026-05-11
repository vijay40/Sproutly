import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';

let client: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

/** Test hook: replace singleton before first `getDb()` call. */
export function setDbForTests(c: SupabaseClient | null): void {
  client = c;
}
