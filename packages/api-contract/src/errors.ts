import { z } from 'zod';

export const ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION',
  'RATE_LIMITED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

const errorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION',
  'RATE_LIMITED',
  'INTERNAL',
]);

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    fields: z.record(z.string()).optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fields = fields;
  }

  toResponse(): { status: number; body: ApiErrorBody } {
    const status = ERROR_HTTP_STATUS[this.code];
    return {
      status,
      body: {
        error: {
          code: this.code,
          message: this.message,
          ...(this.fields ? { fields: this.fields } : {}),
        },
      },
    };
  }
}
