import * as Linking from 'expo-linking';

/**
 * Magic-link `redirect_to` URL. Must appear in Supabase Auth redirect allow list.
 * Uses `expo-linking` only (avoids `expo-auth-session` → native `ExpoCryptoAES` in Expo Go).
 * Expo Go → `exp://...`; dev/standalone → `sproutly://...` (see app.json `scheme`).
 */
export function getAuthEmailRedirectTo(): string {
  return Linking.createURL('auth-callback', { scheme: 'sproutly' });
}
