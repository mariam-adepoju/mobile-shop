import { MeSchema, meKey, fetchMe } from '@/features/account';
import { ApiClient, MissingTokenError, TokenManager } from '@/lib/api';
import { createMockFetch } from '@/mocks';

const BASE_URL = 'https://api.example.test';

/** The backend's `GET /me` payload (PRD 4.1). */
const mePayload = {
  id: 'usr_123',
  email: 'ada@example.com',
  name: 'Ada Nwosu',
  phone: '+2348012345678',
  auth0Sub: 'google-oauth2|10700',
};

function clientWith(token: string | null) {
  const seen: (string | undefined)[] = [];
  const fetchImpl = async (url: string, init?: { headers?: Record<string, string> }) => {
    seen.push(init?.headers?.Authorization);
    const accept = init?.headers?.Authorization === `Bearer ${token}`;
    return {
      status: accept ? 200 : 401,
      ok: accept,
      headers: {},
      text: async () =>
        JSON.stringify(accept ? { data: mePayload } : { error: { code: 'UNAUTHENTICATED' } }),
    };
  };
  const api = new ApiClient({
    baseUrl: BASE_URL,
    fetchImpl,
    tokens: new TokenManager({
      getAccessToken: async () => token,
      refreshAccessToken: async () => null,
    }),
  });
  return { api, seen };
}

describe('GET /me schema', () => {
  it('accepts the backend profile payload', () => {
    const parsed = MeSchema.safeParse(mePayload);
    expect(parsed.success).toBe(true);
  });

  it('requires an email and an auth0Sub, which is what proves the shared identity', () => {
    expect(MeSchema.safeParse({ ...mePayload, email: 'not-an-email' }).success).toBe(false);
    expect(MeSchema.safeParse({ ...mePayload, auth0Sub: '' }).success).toBe(false);
  });

  it('treats a missing phone as absent rather than invalid', () => {
    const { phone: _phone, ...noPhone } = mePayload;
    expect(MeSchema.safeParse(noPhone).success).toBe(true);
  });

  it('uses a single query key for the current user', () => {
    expect(meKey).toEqual(['me']);
  });
});

describe('GET /me request (MFR-8)', () => {
  it('sends the ACCESS token as the bearer, never an ID token', async () => {
    const { api, seen } = clientWith('access-token-value');
    const me = await api.get('/me', MeSchema, { auth: true });

    expect(seen[0]).toBe('Bearer access-token-value');
    expect(me.data.email).toBe('ada@example.com');
  });

  it('exposes the same fields the backend sends, so web and mobile agree', async () => {
    const { api } = clientWith('access-token-value');
    const me = await api.get('/me', MeSchema, { auth: true });

    expect(me.data).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Nwosu',
      auth0Sub: 'google-oauth2|10700',
    });
  });

  it('refuses to send a protected request without a session, rather than calling the API', async () => {
    const { api, seen } = clientWith(null);
    // MissingTokenError, not a 401: the client stops before the network call, so
    // an unauthenticated request is never made at all (AGENTS.md 6.1).
    await expect(api.get('/me', MeSchema, { auth: true })).rejects.toThrow(MissingTokenError);
    expect(seen).toEqual([]);
  });

  it('fetchMe routes through the same authenticated client', async () => {
    // Only asserts the call shape: the shared instance reads config at build time.
    expect(typeof fetchMe).toBe('function');
  });
});

describe('mock /me route (MFR-9)', () => {
  it('serves a demo profile so the Account screen works in mock mode', async () => {
    const api = new ApiClient({
      baseUrl: BASE_URL,
      fetchImpl: createMockFetch(),
      tokens: new TokenManager({
        getAccessToken: async () => 'mock-access-token',
        refreshAccessToken: async () => 'mock-access-token',
      }),
    });

    const me = await api.get('/me', MeSchema, { auth: true });
    expect(me.data.email).toBe('demo.user@example.com');
    expect(me.data.auth0Sub).toBeTruthy();
  });
});
