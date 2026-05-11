import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** `packages/server/src` → package root → monorepo root */
const srcDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(srcDir, '..');
const repoRoot = path.join(serverRoot, '..', '..');

/** Root env first (often shared with Expo); then server package overrides. */
config({ path: path.join(repoRoot, '.env.local') });
config({ path: path.join(repoRoot, '.env') });
config({ path: path.join(serverRoot, '.env.local'), override: true });
config({ path: path.join(serverRoot, '.env'), override: true });
