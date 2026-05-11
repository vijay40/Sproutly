import type { Context } from 'hono';
import type { z } from 'zod';

export async function parseBody<T extends z.ZodTypeAny>(schema: T, c: Context): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    raw = undefined;
  }
  return schema.parse(raw);
}

export function parseQuery<T extends z.ZodTypeAny>(schema: T, c: Context): z.infer<T> {
  const q = c.req.query();
  return schema.parse(q);
}
