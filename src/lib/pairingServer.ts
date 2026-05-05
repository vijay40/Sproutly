/** Base URL for the Node pairing server (see `server/`). No trailing slash. */
const BASE = process.env.EXPO_PUBLIC_PAIRING_SERVER_URL;

/** Full POST URL used by Kid flow to redeem a 6-digit code. */
export function getPairingRedeemUrl(): string {
  const b = BASE?.replace(/\/$/, '') ?? '';
  if (!b) {
    throw new Error('EXPO_PUBLIC_PAIRING_SERVER_URL is not set in .env.local');
  }
  return `${b}/redeem-pairing-code`;
}
