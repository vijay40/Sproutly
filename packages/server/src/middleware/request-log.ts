import { createMiddleware } from 'hono/factory';
import type { Context, Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { ApiError } from '@sproutly/api-contract';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import type { RequestCtx } from './auth.js';

function statusFromCaught(err: unknown): number {
  if (err instanceof ApiError) return err.toResponse().status;
  if (err instanceof ZodError) return 422;
  return 500;
}

function emitAccessLog(c: Context, err: unknown): void {
  const requestId = (c.get('requestId') as string | undefined) ?? 'unknown';
  const started = c.get('requestStartMs') as number;
  const ms = Date.now() - started;
  const ctx = c.get('ctx') as RequestCtx | undefined;
  const status = statusFromCaught(err);
  const base = {
    ts: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    status,
    ms,
    requestId,
    user_id: ctx?.user_id,
    family_id: ctx?.family_id ?? undefined,
  };
  if (err instanceof ApiError || err instanceof ZodError) {
    logger.info({
      ...base,
      level: 'info',
      message: 'request',
      error: err instanceof Error ? err.message : String(err),
    });
  } else {
    logger.error({
      ...base,
      level: 'error',
      message: 'request',
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}

export function registerRequestLog(app: Hono): void {
  app.use(
    '*',
    createMiddleware(async (c, next) => {
      const incoming = c.req.header('x-request-id') ?? c.req.header('X-Request-Id');
      const requestId = incoming?.trim() || randomUUID();
      c.set('requestId', requestId);
      c.set('requestStartMs', Date.now());
      c.header('X-Request-Id', requestId);

      let logged = false;
      try {
        await next();
      } catch (err) {
        emitAccessLog(c, err);
        logged = true;
        throw err;
      } finally {
        if (!logged) {
          const started = c.get('requestStartMs');
          const ms = Date.now() - started;
          const status = c.res.status;
          const ctx = c.get('ctx') as RequestCtx | undefined;
          const access = {
            ts: new Date().toISOString(),
            message: 'request' as const,
            method: c.req.method,
            path: c.req.path,
            status,
            ms,
            requestId: (c.get('requestId') as string | undefined) ?? 'unknown',
            user_id: ctx?.user_id,
            family_id: ctx?.family_id ?? undefined,
          };
          // Hono onError handles thrown errors without rejecting `next()`, so the catch above
          // often does not run; error detail is logged in errors.ts. Surface non-2xx here too.
          if (status >= 400) {
            logger.warn({
              ...access,
              level: 'warn',
              note: 'response_error_status_without_middleware_throw',
            });
          } else {
            logger.info({ ...access, level: 'info' });
          }
        }
      }
    }),
  );
}
