/** Base URL for the Sproutly Node server (see `server/`). No trailing slash. */
const BASE = process.env.EXPO_PUBLIC_SERVER_URL;

function base(): string {
  const b = BASE?.replace(/\/$/, '') ?? '';
  if (!b) {
    throw new Error('EXPO_PUBLIC_SERVER_URL is not set in .env.local');
  }
  return b;
}

/** Full POST URL used by Kid flow to redeem a 6-digit code. */
export function getPairingRedeemUrl(): string {
  return `${base()}/redeem-pairing-code`;
}
