import { z } from 'zod';

import {
  ApiClient,
  ApiError,
  CancelledError,
  ContractError,
  MissingTokenError,
  NetworkError,
  TimeoutError,
  TokenManager,
  type FetchLike,
} from '@/lib/api';

const schema = z.object({ name: z.string() });

interface StubCall {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: string | undefined;
}

interface Stub {
  readonly calls: StubCall[];
  readonly fetchImpl: FetchLike;
}

function stub(
  responses: { status: number; body?: unknown; headers?: Record<string, string> }[],
): Stub {
  const calls: StubCall[] = [];
  let index = 0;

  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      headers: init?.headers ?? {},
      body: init?.body,
    });
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return {
      status: next.status,
      ok: next.status >= 200 && next.status < 300,
      headers: next.headers ?? {},
      text: async () => (next.body === undefined ? '' : JSON.stringify(next.body)),
    };
  };

  return { calls, fetchImpl };
}

function client(overrides: Partial<ConstructorParameters<typeof ApiClient>[0]> = {}) {
  return new ApiClient({
    baseUrl: 'https://api.test/api/v1',
    fetchImpl: stub([{ status: 200, body: { data: { name: 'ok' } } }]).fetchImpl,
    sleep: async () => {},
    ...overrides,
  });
}

describe('ApiClient headers and auth', () => {
  it('sends no Authorization header on a public route', async () => {
    const s = stub([{ status: 200, body: { data: { name: 'ok' } } }]);
    const api = client({ fetchImpl: s.fetchImpl });

    await api.get('/catalog/departments', z.object({ name: z.string() }));

    expect(s.calls[0].headers.Authorization).toBeUndefined();
  });

  it('attaches the access token on a protected route', async () => {
    const s = stub([{ status: 200, body: { data: { name: 'ok' } } }]);
    const tokens = new TokenManager({
      getAccessToken: async () => 'access-token-123',
      refreshAccessToken: async () => null,
    });
    const api = client({ fetchImpl: s.fetchImpl, tokens });

    await api.get('/cart', z.object({ name: z.string() }), { auth: true });

    expect(s.calls[0].headers.Authorization).toBe('Bearer access-token-123');
  });

  it('refuses to send a protected request without a token', async () => {
    const tokens = new TokenManager({
      getAccessToken: async () => null,
      refreshAccessToken: async () => null,
    });
    const api = client({ tokens });

    await expect(api.get('/cart', schema, { auth: true })).rejects.toBeInstanceOf(
      MissingTokenError,
    );
  });

  it('refuses a protected request when no token manager is wired up', async () => {
    await expect(client().get('/cart', schema, { auth: true })).rejects.toBeInstanceOf(
      MissingTokenError,
    );
  });

  it('sends the Idempotency-Key header when one is supplied', async () => {
    const s = stub([{ status: 201, body: { data: { name: 'created' } } }]);
    const api = client({ fetchImpl: s.fetchImpl });

    await api.post('/orders', schema, { body: { x: 1 }, idempotencyKey: 'key-abc' });

    expect(s.calls[0].headers['Idempotency-Key']).toBe('key-abc');
  });

  it('omits Idempotency-Key when none is supplied', async () => {
    const s = stub([{ status: 200, body: { data: { name: 'ok' } } }]);
    const api = client({ fetchImpl: s.fetchImpl });

    await api.post('/cart/items', schema, { body: { productId: 'p1' } });

    expect(s.calls[0].headers['Idempotency-Key']).toBeUndefined();
  });

  it('serialises the JSON body and query string', async () => {
    const s = stub([{ status: 200, body: { data: { name: 'ok' } } }]);
    const api = client({ fetchImpl: s.fetchImpl });

    await api.get('/catalog/products', schema, {
      query: { department: 'Pharmacy', page: 2, missing: undefined },
    });

    expect(s.calls[0].url).toBe(
      'https://api.test/api/v1/catalog/products?department=Pharmacy&page=2',
    );
    expect(s.calls[0].method).toBe('GET');
  });
});

describe('ApiClient envelope and schema validation', () => {
  it('unwraps the { data } envelope', async () => {
    const s = stub([{ status: 200, body: { data: { name: 'Paracetamol' } } }]);
    const api = client({ fetchImpl: s.fetchImpl });

    const result = await api.get('/x', z.object({ name: z.string() }));

    expect(result.data).toEqual({ name: 'Paracetamol' });
    expect(result.status).toBe(200);
  });

  it('throws ContractError when data fails the endpoint schema', async () => {
    const s = stub([{ status: 200, body: { data: { name: 42 } } }]);
    const api = client({ fetchImpl: s.fetchImpl });

    await expect(api.get('/x', z.object({ name: z.string() }))).rejects.toBeInstanceOf(
      ContractError,
    );
  });

  it('throws ContractError when the envelope itself is missing', async () => {
    const s = stub([{ status: 200, body: { items: [] } }]);
    const api = client({ fetchImpl: s.fetchImpl });

    await expect(api.get('/x', schema)).rejects.toBeInstanceOf(ContractError);
  });

  it('never puts the offending payload on the ContractError', async () => {
    const s = stub([{ status: 200, body: { data: { name: 42, phone: '+2348012345678' } } }]);
    const api = client({ fetchImpl: s.fetchImpl });

    const error = await api.get('/x', schema).catch((e: unknown) => e);

    expect(JSON.stringify(error)).not.toContain('2348012345678');
  });
});

describe('ApiClient error mapping', () => {
  it('maps the error envelope to a typed ApiError', async () => {
    const s = stub([
      {
        status: 409,
        body: {
          error: {
            code: 'OUT_OF_STOCK',
            message: 'gone',
            fieldErrors: { quantity: 'Only 2 left' },
          },
        },
      },
    ]);
    const api = client({ fetchImpl: s.fetchImpl });

    const error = await api.get('/cart', schema).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe('OUT_OF_STOCK');
    expect(apiError.status).toBe(409);
    expect(apiError.fieldErrors).toEqual({ quantity: 'Only 2 left' });
  });

  it('preserves an undocumented code verbatim instead of crashing', async () => {
    const s = stub([{ status: 400, body: { error: { code: 'BRAND_NEW_CODE' } } }]);
    const api = client({ fetchImpl: s.fetchImpl });

    const error = (await api.get('/x', schema).catch((e: unknown) => e)) as ApiError;

    expect(error.code).toBe('BRAND_NEW_CODE');
  });

  it('derives a code from the status when the body is not a valid envelope', async () => {
    const s = stub([{ status: 404, body: '<html>not found</html>' }]);
    const api = client({ fetchImpl: s.fetchImpl });

    const error = (await api.get('/x', schema).catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
  });

  it('surfaces Retry-After on a 429 as a distinct rate-limited state', async () => {
    const s = stub([
      {
        status: 429,
        headers: { 'Retry-After': '30' },
        body: { error: { code: 'RATE_LIMITED' } },
      },
    ]);
    const api = client({ fetchImpl: s.fetchImpl });

    const error = (await api.get('/cart', schema).catch((e: unknown) => e)) as ApiError;

    expect(error.isRateLimited).toBe(true);
    expect(error.retryAfterSeconds).toBe(30);
  });

  it('captures x-correlation-id for support', async () => {
    const s = stub([
      {
        status: 400,
        headers: { 'x-correlation-id': 'corr-123' },
        body: { error: { code: 'VALIDATION_ERROR' } },
      },
    ]);
    const api = client({ fetchImpl: s.fetchImpl });

    const error = (await api.get('/x', schema).catch((e: unknown) => e)) as ApiError;

    expect(error.correlationId).toBe('corr-123');
  });
});

describe('ApiClient timeout and transport', () => {
  it('aborts and throws TimeoutError once the budget is exhausted', async () => {
    const hanging: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });

    const api = client({
      fetchImpl: hanging,
      timeoutMs: 20,
      retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1 },
    });

    await expect(api.get('/x', schema)).rejects.toBeInstanceOf(TimeoutError);
  });

  it('maps a transport failure to NetworkError', async () => {
    const failing: FetchLike = async () => {
      throw new TypeError('Network request failed');
    };
    const api = client({
      fetchImpl: failing,
      retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1 },
    });

    await expect(api.get('/x', schema)).rejects.toBeInstanceOf(NetworkError);
  });

  it('reports caller cancellation as CancelledError, not a failure', async () => {
    const controller = new AbortController();
    const hanging: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });

    const api = client({ fetchImpl: hanging });
    const pending = api.get('/x', schema, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(CancelledError);
  });
});

const FAST_RETRY = { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1 } as const;

describe('ApiClient 401 handling', () => {
  function tokensReturning(token: string | null, refresh: () => Promise<string | null>) {
    return new TokenManager({ getAccessToken: async () => token, refreshAccessToken: refresh });
  }

  it('refreshes once and retries the request with the new token', async () => {
    const s = stub([
      { status: 401, body: { error: { code: 'UNAUTHENTICATED' } } },
      { status: 200, body: { data: { name: 'ok' } } },
    ]);
    let refreshCalls = 0;
    const tokens = tokensReturning('stale', async () => {
      refreshCalls += 1;
      return 'fresh';
    });
    const api = client({ fetchImpl: s.fetchImpl, tokens });

    const result = await api.get('/cart', schema, { auth: true });

    expect(result.data).toEqual({ name: 'ok' });
    expect(refreshCalls).toBe(1);
    expect(s.calls[0].headers.Authorization).toBe('Bearer stale');
    expect(s.calls[1].headers.Authorization).toBe('Bearer fresh');
  });

  it('retries only ONCE: a second 401 surfaces as ApiError', async () => {
    const s = stub([{ status: 401, body: { error: { code: 'UNAUTHENTICATED' } } }]);
    const tokens = tokensReturning('stale', async () => 'fresh');
    const api = client({ fetchImpl: s.fetchImpl, tokens });

    const error = (await api
      .get('/cart', schema, { auth: true })
      .catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    // original + one retry = 2 requests, never a loop
    expect(s.calls).toHaveLength(2);
  });

  it('emits session-expired when the retry is also 401', async () => {
    const s = stub([{ status: 401, body: { error: { code: 'UNAUTHENTICATED' } } }]);
    const tokens = tokensReturning('stale', async () => 'fresh');
    let expired = 0;
    const api = client({
      fetchImpl: s.fetchImpl,
      tokens,
      onSessionExpired: () => (expired += 1),
    });

    await api.get('/cart', schema, { auth: true }).catch(() => undefined);

    expect(expired).toBe(1);
  });

  it('shares ONE refresh across many concurrent 401s', async () => {
    const calls: StubCall[] = [];
    // The stale token is always rejected; the refreshed one is accepted.
    const fetchImpl: FetchLike = async (url, init) => {
      const auth = init?.headers?.Authorization ?? '';
      calls.push({
        url,
        method: init?.method ?? 'GET',
        headers: init?.headers ?? {},
        body: undefined,
      });
      const accepted = auth === 'Bearer fresh';
      return {
        status: accepted ? 200 : 401,
        ok: accepted,
        headers: {},
        text: async () =>
          JSON.stringify(
            accepted ? { data: { name: 'ok' } } : { error: { code: 'UNAUTHENTICATED' } },
          ),
      };
    };

    let refreshCalls = 0;
    const tokens = new TokenManager({
      getAccessToken: async () => 'stale',
      refreshAccessToken: async () => {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return 'fresh';
      },
    });
    const api = client({ fetchImpl, tokens });

    await Promise.all(Array.from({ length: 5 }, () => api.get('/cart', schema, { auth: true })));

    // One shared refresh, not one per concurrent request.
    expect(refreshCalls).toBe(1);
    expect(calls.filter((c) => c.headers.Authorization === 'Bearer fresh')).toHaveLength(5);
  });

  it('does not attempt a refresh for a public route that 401s', async () => {
    const s = stub([{ status: 401, body: { error: { code: 'UNAUTHENTICATED' } } }]);
    let refreshCalls = 0;
    const tokens = new TokenManager({
      getAccessToken: async () => 'stale',
      refreshAccessToken: async () => {
        refreshCalls += 1;
        return 'fresh';
      },
    });
    const api = client({ fetchImpl: s.fetchImpl, tokens });

    await api.get('/catalog/departments', schema).catch(() => undefined);

    expect(refreshCalls).toBe(0);
    expect(s.calls).toHaveLength(1);
  });
});

describe('ApiClient retry policy', () => {
  it('retries an idempotent GET on a 500 up to the attempt cap', async () => {
    const s = stub([{ status: 500, body: { error: { code: 'INTERNAL_ERROR' } } }]);
    const api = client({ fetchImpl: s.fetchImpl, retry: FAST_RETRY });

    await api.get('/catalog/departments', schema).catch(() => undefined);

    expect(s.calls).toHaveLength(FAST_RETRY.maxAttempts);
  });

  it('recovers a GET that fails once then succeeds', async () => {
    const s = stub([
      { status: 500, body: { error: { code: 'INTERNAL_ERROR' } } },
      { status: 200, body: { data: { name: 'ok' } } },
    ]);
    const api = client({ fetchImpl: s.fetchImpl, retry: FAST_RETRY });

    const result = await api.get('/catalog/departments', schema);

    expect(result.data).toEqual({ name: 'ok' });
    expect(s.calls).toHaveLength(2);
  });

  it('never auto-retries a mutation without an idempotency key', async () => {
    const s = stub([{ status: 500, body: { error: { code: 'INTERNAL_ERROR' } } }]);
    const api = client({ fetchImpl: s.fetchImpl, retry: FAST_RETRY });

    await api.post('/cart/items', schema, { body: { productId: 'p' } }).catch(() => undefined);

    expect(s.calls).toHaveLength(1);
  });

  it('retries a mutation that carries an idempotency key', async () => {
    const s = stub([
      { status: 500, body: { error: { code: 'INTERNAL_ERROR' } } },
      { status: 201, body: { data: { name: 'created' } } },
    ]);
    const api = client({ fetchImpl: s.fetchImpl, retry: FAST_RETRY });

    await api.post('/orders', schema, { body: {}, idempotencyKey: 'stable-key' });

    expect(s.calls).toHaveLength(2);
    // Same key on both attempts, so the server dedupes rather than duplicating.
    expect(s.calls[0].headers['Idempotency-Key']).toBe('stable-key');
    expect(s.calls[1].headers['Idempotency-Key']).toBe('stable-key');
  });

  it('does not retry a 4xx that a retry cannot fix', async () => {
    const s = stub([{ status: 409, body: { error: { code: 'OUT_OF_STOCK' } } }]);
    const api = client({ fetchImpl: s.fetchImpl, retry: FAST_RETRY });

    await api.get('/cart', schema).catch(() => undefined);

    expect(s.calls).toHaveLength(1);
  });

  it('does not retry a contract mismatch', async () => {
    const s = stub([{ status: 200, body: { data: { wrong: true } } }]);
    const api = client({ fetchImpl: s.fetchImpl, retry: FAST_RETRY });

    await api.get('/x', schema).catch(() => undefined);

    expect(s.calls).toHaveLength(1);
  });
});
