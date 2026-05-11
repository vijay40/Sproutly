import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { ApiError } from '@sproutly/api-contract';
import { env } from '../env.js';
import { getDb } from '../db/client.js';

function jwtSecret(): string {
  return process.env.VITEST === 'true'
    ? (process.env.SUPABASE_JWT_SECRET ?? 'test-jwt-secret')
    : env.SUPABASE_JWT_SECRET;
}

export type RequestCtx = {
  user_id: string;
  family_id: string | null;
  timezone: string | null;
};

declare module 'hono' {
  interface ContextVariableMap {
    /** Set by auth middleware on protected routes only. */
    ctx?: RequestCtx;
    /** Set by request-log middleware on every request. */
    requestId?: string;
    requestStartMs?: number;
  }
}

type AuthOpts = { requireFamily: boolean };

export function authMiddleware(opts: AuthOpts) {
  return createMiddleware(async (c, next) => {
    const authz = c.req.header('Authorization');
    if (!authz?.startsWith('Bearer ')) {
      throw new ApiError('UNAUTHENTICATED', 'Missing bearer token');
    }
    const token = authz.slice('Bearer '.length).trim();
    let sub: string;
    try {
      const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
      if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
        throw new ApiError('UNAUTHENTICATED', 'Invalid token payload');
      }
      sub = String((decoded as jwt.JwtPayload).sub);
      if (!sub) throw new ApiError('UNAUTHENTICATED', 'Invalid token subject');
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');
    }

    const db = getDb();
    const { data: fam, error } = await db
      .from('families')
      .select('id, timezone')
      .eq('parent_user_id', sub)
      .maybeSingle();

    if (error) {
      throw new ApiError('INTERNAL', 'Failed to load family');
    }

    if (!fam && opts.requireFamily) {
      throw new ApiError('FORBIDDEN', 'No family for this user');
    }

    c.set('ctx', {
      user_id: sub,
      family_id: fam?.id ?? null,
      timezone: fam?.timezone ?? null,
    });
    await next();
  });
}
