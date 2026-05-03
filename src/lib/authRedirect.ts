import { makeRedirectUri } from 'expo-auth-session';

/**
 * Magic-link `redirect_to` URL. Must appear in Supabase Auth redirect allow list.
 * Expo Go → `exp://...`; dev/standalone → `sproutly://...` (see app.json `scheme`).
 */
export function getAuthEmailRedirectTo(): string {
  return makeRedirectUri({
    scheme: 'sproutly',
    path: 'auth-callback',
  });
}
