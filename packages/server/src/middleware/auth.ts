import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import jwt from 'jsonwebtoken';
import { ApiError } from '@sproutly/api-contract';
import { env } from '../env.js';
import { getDb } from '../db/client.js';

const JWKS_URL = new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
const remoteJwks = createRemoteJWKSet(JWKS_URL);

async function verifyToken(token: string): Promise<JWTPayload> {
  // In Vitest, tests sign HS256 tokens inline with SUPABASE_JWT_SECRET; skip JWKS.
  if (process.env.VITEST === 'true') {
    const secret = process.env.SUPABASE_JWT_SECRET ?? 'test-jwt-secret';
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded) throw new Error('Invalid payload');
    return decoded as JWTPayload;
  }

  // Production: verify against the Supabase project's JWKS (asymmetric signing keys).
  try {
    const { payload } = await jwtVerify(token, remoteJwks);
    return payload;
  } catch (jwksErr) {
    // Legacy projects still sign with HS256 + a shared secret. If one is
    // configured, fall back so either key model works.
    if (env.SUPABASE_JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
        if (typeof decoded === 'string' || !decoded) throw new Error('Invalid payload');
        return decoded as JWTPayload;
      } catch {
        throw jwksErr;
      }
    }
    throw jwksErr;
  }
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
      const payload = await verifyToken(token);
      if (!payload || typeof payload !== 'object' || !payload.sub) {
        throw new ApiError('UNAUTHENTICATED', 'Invalid token payload');
      }
      sub = String(payload.sub);
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
