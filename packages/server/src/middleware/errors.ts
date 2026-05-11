import type { Hono } from 'hono';
import { ApiError } from '@sproutly/api-contract';
import { ZodError } from 'zod';
import { logger } from '../logger.js';

function zodToFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path.length ? issue.path.join('.') : '_root';
    fields[path] = issue.message;
  }
  return fields;
}

export function registerErrorHandler(app: Hono): void {
  app.onError((err, c) => {
    const requestId = c.get('requestId');
    if (requestId) {
      c.header('X-Request-Id', requestId);
    }
    const base = {
      message: 'request_error' as const,
      requestId: requestId ?? 'unknown',
      method: c.req.method,
      path: c.req.path,
    };
    if (err instanceof ApiError) {
      const { status, body } = err.toResponse();
      logger.warn({
        ...base,
        level: 'warn',
        errKind: 'ApiError',
        errCode: err.code,
        errMessage: err.message,
        httpStatus: status,
        ...(err.fields ? { errFields: err.fields } : {}),
      });
      return c.json(body, status);
    }
    if (err instanceof ZodError) {
      logger.warn({
        ...base,
        level: 'warn',
        errKind: 'ZodError',
        errMessage: err.message,
        issueCount: err.issues.length,
      });
      return c.json(
        {
          error: {
            code: 'VALIDATION' as const,
            message: 'Invalid request',
            fields: zodToFields(err),
          },
        },
        422,
      );
    }
    logger.error({
      ...base,
      level: 'error',
      errKind: err instanceof Error ? err.name : typeof err,
      errMessage: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return c.json(
      {
        error: {
          code: 'INTERNAL' as const,
          message: 'Something went wrong',
        },
      },
      500,
    );
  });
}
