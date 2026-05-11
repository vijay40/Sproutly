/** Base URL for trusted Node endpoints (see `packages/server`). No trailing slash. */
const BASE = process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_SERVER_URL;

function base(): string {
  const b = BASE?.replace(/\/$/, '') ?? '';
  if (!b) {
    throw new Error('EXPO_PUBLIC_API_URL is not set in .env.local');
  }
  return b;
}

/** Full POST URL used by Kid flow to redeem a 6-digit code. */
export function getPairingRedeemUrl(): string {
  return `${base()}/redeem-pairing-code`;
}
