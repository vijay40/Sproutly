import type { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { ApiError, ImpersonateRequest, ImpersonateResponse } from '@sproutly/api-contract';
import { env } from '../env.js';
import { getDb } from '../db/client.js';
import { logger } from '../logger.js';
import { parseBody } from '../middleware/validate.js';

function jwtSecret(): string {
  return process.env.VITEST === 'true'
    ? (process.env.SUPABASE_JWT_SECRET ?? 'test-jwt-secret')
    : env.SUPABASE_JWT_SECRET;
}

export function devRoute(app: Hono): void {
  app.post('/dev/impersonate', async (c) => {
    if (process.env.NODE_ENV === 'production') {
      return c.notFound();
    }

    const { email } = await parseBody(ImpersonateRequest, c);
    const db = getDb();
    const requestId = c.get('requestId');

    const { data: list, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) {
      logger.error({
        message: 'dev_impersonate_list_users_failed',
        requestId,
        upstreamMessage: listErr.message,
        upstreamName: 'name' in listErr ? (listErr as { name?: string }).name : undefined,
        upstreamStatus: 'status' in listErr ? (listErr as { status?: number }).status : undefined,
        upstreamCode: 'code' in listErr ? String((listErr as { code?: unknown }).code) : undefined,
      });
      throw new ApiError('INTERNAL', 'Failed to list users');
    }

    const users = list?.users ?? [];
    const match = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (!match) {
      throw new ApiError('FORBIDDEN', 'User is not a parent in any family');
    }

    const { data: fam, error: famErr } = await db
      .from('families')
      .select('id')
      .eq('parent_user_id', match.id)
      .maybeSingle();

    if (famErr || !fam) {
      if (famErr) {
        logger.error({
          message: 'dev_impersonate_family_lookup_failed',
          requestId,
          upstreamMessage: famErr.message,
          upstreamCode: famErr.code,
          upstreamDetails: famErr.details,
          upstreamHint: famErr.hint,
        });
      } else {
        logger.warn({
          message: 'dev_impersonate_no_family_row',
          requestId,
          parentUserId: match.id,
        });
      }
      throw new ApiError('FORBIDDEN', 'User is not a parent in any family');
    }

    const expSec = Math.floor(Date.now() / 1000) + 3600;
    const access_token = jwt.sign(
      { sub: match.id, role: 'authenticated', aud: 'authenticated' },
      jwtSecret(),
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const expires_at = new Date(expSec * 1000).toISOString();
    let body: { access_token: string; expires_at: string };
    try {
      body = ImpersonateResponse.parse({ access_token, expires_at });
    } catch (parseErr) {
      logger.error({
        message: 'dev_impersonate_response_schema_failed',
        requestId,
        expires_at,
        accessTokenLength: access_token.length,
        parseMessage: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      throw parseErr;
    }
    return c.json(body);
  });
}
