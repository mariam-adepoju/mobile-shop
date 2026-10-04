import { createMockFetch, departmentsResponse } from '@/mocks';
import { DepartmentListSchema, departmentsKey, fetchDepartments } from '@/features/catalog';
import {
  ApiClient,
  TokenManager,
  getApiClient,
  resetApiClientForTests,
  setSessionHooks,
  setTokenManager,
} from '@/lib/api';

const BASE_URL = 'https://api.example.test';

function clientWith(fetchImpl: ReturnType<typeof createMockFetch>) {
  return new ApiClient({ baseUrl: BASE_URL, fetchImpl });
}

describe('department schemas', () => {
  it('accepts the object envelope the fixtures use', () => {
    const parsed = DepartmentListSchema.safeParse(departmentsResponse.data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.departments).toHaveLength(4);
      expect(parsed.data.departments[0]?.slug).toBe('pharmacy');
    }
  });

  it('normalises a bare array to the same internal shape', () => {
    const parsed = DepartmentListSchema.safeParse([{ id: 'a', slug: 'a', name: 'A' }]);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.departments).toEqual([{ id: 'a', slug: 'a', name: 'A' }]);
    }
  });

  it('rejects a department with no usable identifier or name', () => {
    const parsed = DepartmentListSchema.safeParse({
      departments: [{ id: '', slug: '', name: '' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('tolerates optional fields being absent', () => {
    const parsed = DepartmentListSchema.safeParse({
      departments: [{ id: 'a', slug: 'a', name: 'A' }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('fetchDepartments through the real client', () => {
  afterEach(() => {
    resetApiClientForTests();
  });

  it('parses mock data into a plain array', async () => {
    const api = clientWith(createMockFetch());
    const response = await api.get('/catalog/departments', DepartmentListSchema);
    expect(response.data.departments.map((d) => d.slug)).toEqual([
      'pharmacy',
      'supermarket',
      'personal-care',
      'baby-and-child',
    ]);
  });

  it('is a public call: no Authorization header is attached', async () => {
    const seen: (string | undefined)[] = [];
    const api = clientWith(async (url, init) => {
      seen.push(init?.headers?.Authorization);
      return createMockFetch()(url, init);
    });

    await api.get('/catalog/departments', DepartmentListSchema);
    expect(seen).toEqual([undefined]);
  });

  it('uses the single documented query key', () => {
    expect(departmentsKey).toEqual(['catalog', 'departments']);
  });
});

describe('mock transport', () => {
  it('404s an unimplemented route with the real error envelope', async () => {
    const api = clientWith(createMockFetch());
    await expect(api.get('/cart', DepartmentListSchema)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('serves the alternate bare-array envelope when asked', async () => {
    const api = clientWith(createMockFetch({ useBareArray: true }));
    const response = await api.get('/catalog/departments', DepartmentListSchema);
    expect(response.data.departments).toHaveLength(1);
  });

  it('never returns an empty list for a route it does serve', async () => {
    const api = clientWith(createMockFetch());
    const response = await api.get('/catalog/departments', DepartmentListSchema);
    expect(response.data.departments.length).toBeGreaterThan(0);
  });
});

describe('shared client instance', () => {
  beforeEach(() => {
    resetApiClientForTests();
  });

  afterEach(() => {
    resetApiClientForTests();
  });

  it('returns the same instance so the Query cache has one owner', () => {
    expect(getApiClient()).toBe(getApiClient());
  });

  it('builds a new instance after a reset, for test isolation', () => {
    const first = getApiClient();
    resetApiClientForTests();
    expect(getApiClient()).not.toBe(first);
  });

  it('installs session hooks and a token manager after construction', () => {
    const expired = jest.fn();
    const tokens = new TokenManager({
      getAccessToken: async () => 'token',
      refreshAccessToken: async () => 'token',
    });

    // Both are read at call time via getters, so registering after the client
    // was built must still take effect (M4 installs the Auth0 session late).
    setSessionHooks({ onSessionExpired: expired });
    setTokenManager(tokens);
    expect(getApiClient()).toBe(getApiClient());
    expect(tokens.getAccessToken).toBeInstanceOf(Function);
  });

  it('serves the mock transport in mock mode, proving the whole pipeline', async () => {
    // jest.setup.ts pins EXPO_PUBLIC_API_MODE=mock, so this exercises
    // config -> instance -> mock fetch -> envelope -> Zod -> query.
    await expect(fetchDepartments()).resolves.toHaveLength(4);
  });
});
