import type { ChildRow, FamilyRow, TaskCompletionRow, TaskRow } from '../types/db';

export interface KidCacheStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface KidCachePayload {
  tasks: TaskRow[];
  completions: TaskCompletionRow[];
  child: ChildRow;
  family: FamilyRow;
  /** Most recent `completed_at` in `completions`; used on reconnect replay. */
  lastCompletedAt: string | null;
}

// V1 invariant: one child per iPad. Key partitioning accepts childId defensively
// so a future multi-child device doesn't reuse the wrong cache.
function keyFor(childId: string, localDate: string): string {
  return `kid.today.${childId}.${localDate}`;
}

export async function loadKidCache(
  storage: KidCacheStorage,
  args: { childId: string; localDate: string },
): Promise<KidCachePayload | null> {
  const raw = await storage.getItem(keyFor(args.childId, args.localDate));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as KidCachePayload;
  } catch {
    return null;
  }
}

export async function saveKidCache(
  storage: KidCacheStorage,
  args: { childId: string; localDate: string; payload: KidCachePayload },
): Promise<void> {
  await storage.setItem(keyFor(args.childId, args.localDate), JSON.stringify(args.payload));
}
