import {
  ApiError,
  ApiErrorBodySchema,
  GetMeResponse,
  PatchMeRequest,
  type PatchMeRequest as PatchMeBody,
} from '@sproutly/api-contract';
import { getParentClient } from './supabase';

function apiBaseUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_API_URL;
}

async function parseErrorBody(res: Response): Promise<ApiError> {
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw new ApiError('INTERNAL', `HTTP ${res.status}`);
  }
  const parsed = ApiErrorBodySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('INTERNAL', `HTTP ${res.status}`);
  }
  const e = parsed.data.error;
  return new ApiError(e.code, e.message, e.fields);
}

async function requestJson<T>(
  method: string,
  path: string,
  opts: { body?: unknown; responseSchema: import('zod').ZodType<T>; auth: boolean },
): Promise<T> {
  const base = apiBaseUrl();
  if (!base) {
    throw new ApiError('INTERNAL', 'EXPO_PUBLIC_API_URL is not configured');
  }

  const url = `${base.replace(/\/$/, '')}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const doFetch = async (): Promise<Response> => {
    const h = { ...headers };
    if (opts.auth) {
      const { data } = await getParentClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new ApiError('UNAUTHENTICATED', 'No session');
      }
      h.Authorization = `Bearer ${token}`;
    }
    return fetch(url, {
      method,
      headers: h,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && opts.auth) {
    const { error } = await getParentClient().auth.refreshSession();
    if (error) {
      await getParentClient().auth.signOut();
      throw new ApiError('UNAUTHENTICATED', 'Session expired');
    }
    res = await doFetch();
    if (res.status === 401) {
      await getParentClient().auth.signOut();
      throw new ApiError('UNAUTHENTICATED', 'Session expired');
    }
  }

  if (!res.ok) {
    throw await parseErrorBody(res);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('INTERNAL', 'Invalid JSON response');
  }

  const parsed = opts.responseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError('INTERNAL', 'response shape mismatch');
  }
  return parsed.data;
}

export const api = {
  me: {
    get: () => requestJson('GET', '/me', { responseSchema: GetMeResponse, auth: true }),
    patch: (body: PatchMeBody) =>
      requestJson('PATCH', '/me', {
        body: PatchMeRequest.parse(body),
        responseSchema: GetMeResponse,
        auth: true,
      }),
  },
};

export { ApiError } from '@sproutly/api-contract';
