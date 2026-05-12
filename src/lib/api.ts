import {
  ApiError,
  ApiErrorBodySchema,
  Child,
  ChildrenListResponse,
  CosmeticsListResponse,
  CreateChildRequest,
  CreateFamilyRequest,
  CreateFamilyResponse,
  CreateTaskCompletionRequest,
  CreateTaskCompletionResponse,
  CreateTaskRequest,
  DailySummariesListResponse,
  DayRollRequest,
  DayRollResponse,
  GetMeResponse,
  Insight,
  InsightsListResponse,
  PatchMeRequest,
  type PatchMeRequest as PatchMeBody,
  Task,
  TasksListResponse,
  TaskCompletionsListResponse,
  UpdateChildRequest,
  UpdateTaskRequest,
} from '@sproutly/api-contract';
import type { z } from 'zod';
import { getParentClient } from './supabase';

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}

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
  families: {
    create: (body: z.infer<typeof CreateFamilyRequest>) =>
      requestJson('POST', '/families', {
        body: CreateFamilyRequest.parse(body),
        responseSchema: CreateFamilyResponse,
        auth: true,
      }),
  },
  children: {
    list: () => requestJson('GET', '/children', { responseSchema: ChildrenListResponse, auth: true }),
    create: (body: z.infer<typeof CreateChildRequest>) =>
      requestJson('POST', '/children', {
        body: CreateChildRequest.parse(body),
        responseSchema: Child,
        auth: true,
      }),
    update: (id: string, body: z.infer<typeof UpdateChildRequest>) =>
      requestJson('PATCH', `/children/${encodeURIComponent(id)}`, {
        body: UpdateChildRequest.parse(body),
        responseSchema: Child,
        auth: true,
      }),
  },
  tasks: {
    list: (params?: {
      is_active?: 'true' | 'false' | 'all';
      is_bonus?: 'true' | 'false';
      child_id?: string;
    }) =>
      requestJson('GET', withQuery('/tasks', params ?? {}), {
        responseSchema: TasksListResponse,
        auth: true,
      }),
    create: (body: z.infer<typeof CreateTaskRequest>) =>
      requestJson('POST', '/tasks', {
        body: CreateTaskRequest.parse(body),
        responseSchema: Task,
        auth: true,
      }),
    update: (id: string, body: z.infer<typeof UpdateTaskRequest>) =>
      requestJson('PATCH', `/tasks/${encodeURIComponent(id)}`, {
        body: UpdateTaskRequest.parse(body),
        responseSchema: Task,
        auth: true,
      }),
    softDelete: (id: string) =>
      requestJson('DELETE', `/tasks/${encodeURIComponent(id)}`, {
        responseSchema: Task,
        auth: true,
      }),
  },
  cosmetics: {
    list: () => requestJson('GET', '/cosmetics', { responseSchema: CosmeticsListResponse, auth: true }),
  },
  dailySummaries: {
    list: (params: { child_id: string; from?: string; to?: string }) =>
      requestJson('GET', withQuery('/daily-summaries', params), {
        responseSchema: DailySummariesListResponse,
        auth: true,
      }),
  },
  insights: {
    list: (params?: { state?: 'active' | 'applied' | 'dismissed' | 'all' }) =>
      requestJson('GET', withQuery('/insights', params ?? {}), {
        responseSchema: InsightsListResponse,
        auth: true,
      }),
    apply: (id: string) =>
      requestJson('POST', `/insights/${encodeURIComponent(id)}/apply`, {
        responseSchema: Insight,
        auth: true,
      }),
    dismiss: (id: string) =>
      requestJson('POST', `/insights/${encodeURIComponent(id)}/dismiss`, {
        responseSchema: Insight,
        auth: true,
      }),
  },
  taskCompletions: {
    list: (params: { child_id: string; local_date?: string }) =>
      requestJson('GET', withQuery('/task-completions', params), {
        responseSchema: TaskCompletionsListResponse,
        auth: true,
      }),
    create: (body: z.infer<typeof CreateTaskCompletionRequest>) =>
      requestJson('POST', '/task-completions', {
        body: CreateTaskCompletionRequest.parse(body),
        responseSchema: CreateTaskCompletionResponse,
        auth: true,
      }),
  },
  dayRoll: {
    run: (body: z.infer<typeof DayRollRequest> = {}) =>
      requestJson('POST', '/day-roll', {
        body: DayRollRequest.parse(body),
        responseSchema: DayRollResponse,
        auth: true,
      }),
  },
};

export { ApiError } from '@sproutly/api-contract';
