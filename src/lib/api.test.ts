import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GetMeResponse } from '@sproutly/api-contract';

const getSession = vi.fn();
const refreshSession = vi.fn();
const signOut = vi.fn();

vi.mock('./supabase', () => ({
  getParentClient: () => ({
    auth: {
      getSession,
      refreshSession,
      signOut,
    },
  }),
}));

const fetchMock = vi.fn();

describe('api client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://localhost:8787');
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    getSession.mockReset();
    refreshSession.mockReset();
    signOut.mockReset();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('sends Authorization bearer from getSession', async () => {
    const { api } = await import('./api');
    getSession.mockResolvedValue({
      data: { session: { access_token: 'tok1' } },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          GetMeResponse.parse({
            user_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
            family_id: null,
            timezone: null,
            has_onboarded: false,
          }),
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await api.me.get();

    expect(fetchMock).toHaveBeenCalled();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok1');
  });

  it('401 then refresh then retry succeeds', async () => {
    const { api } = await import('./api');
    getSession.mockResolvedValue({
      data: { session: { access_token: 'old' } },
    });
    refreshSession.mockResolvedValue({ error: null });
    const body = GetMeResponse.parse({
      user_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      family_id: null,
      timezone: null,
      has_onboarded: false,
    });
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'x' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }));

    const result = await api.me.get();
    expect(result.user_id).toBe(body.user_id);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('401 twice signs out and throws', async () => {
    const { api } = await import('./api');
    getSession.mockResolvedValue({
      data: { session: { access_token: 'old' } },
    });
    refreshSession.mockResolvedValue({ error: null });
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'm' } }), {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'm' } }), {
          status: 401,
        }),
      );

    await expect(api.me.get()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(signOut).toHaveBeenCalled();
  });

  it('parses error envelope', async () => {
    const { api } = await import('./api');
    getSession.mockResolvedValue({
      data: { session: { access_token: 't' } },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: 'NOT_FOUND', message: 'gone' },
        }),
        { status: 404 },
      ),
    );

    await expect(api.me.get()).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'gone' });
  });

  it('2xx invalid shape throws INTERNAL response shape mismatch', async () => {
    const { api } = await import('./api');
    getSession.mockResolvedValue({
      data: { session: { access_token: 't' } },
    });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ wrong: true }), { status: 200 }));

    await expect(api.me.get()).rejects.toMatchObject({
      code: 'INTERNAL',
      message: 'response shape mismatch',
    });
  });
});
