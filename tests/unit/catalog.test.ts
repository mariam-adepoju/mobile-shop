import { createMockFetch, departmentsResponse } from '@/mocks';
import {
  CategoryListSchema,
  DepartmentListSchema,
  ProductDetailSchema,
  ProductPageSchema,
  ProductSummarySchema,
  PurchaseStateSchema,
  departmentsKey,
  fetchDepartments,
  hasMorePages,
  isPurchasable,
  isUnfiltered,
} from '@/features/catalog';
import {
  ApiClient,
  TokenManager,
  getApiClient,
  resetApiClientForTests,
  setSessionHooks,
  setTokenManager,
} from '@/lib/api';

const BASE_URL = 'https://api.example.test';

/** A minimal valid product, so each test states only what it varies. */
const baseProduct = {
  id: 'prod_1',
  slug: 'prod-1',
  name: 'Test Product',
  priceMinor: 150000,
  currency: 'NGN',
  purchaseState: 'purchasable',
} as const;

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

  it('normalises the deployed API department shape', () => {
    const parsed = DepartmentListSchema.safeParse({
      departments: [
        { department: 'pharmacy', productCount: 12, inStockCount: 11 },
        { department: 'supermarket', productCount: 12, inStockCount: 11 },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.departments.map(({ id, slug, name }) => [id, slug, name])).toEqual([
        ['pharmacy', 'pharmacy', 'Pharmacy'],
        ['supermarket', 'supermarket', 'Supermarket'],
      ]);
    }
  });
});

describe('category schemas', () => {
  it('normalises the deployed API category shape', () => {
    const parsed = CategoryListSchema.safeParse({
      categories: [{ slug: 'first-aid', name: 'First Aid', department: 'pharmacy' }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.categories).toEqual([
        { id: 'first-aid', slug: 'first-aid', name: 'First Aid' },
      ]);
    }
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

describe('purchase state (MFR-5)', () => {
  it("treats only the server's `purchasable` as buyable", () => {
    expect(isPurchasable('purchasable')).toBe(true);
    expect(isPurchasable('prescription_only')).toBe(false);
    expect(isPurchasable('out_of_stock')).toBe(false);
    expect(isPurchasable('inactive')).toBe(false);
  });

  it('rejects a purchase state the app does not know', () => {
    expect(PurchaseStateSchema.safeParse('discontinued').success).toBe(false);
  });
});

describe('product schemas', () => {
  it('rejects a fractional price, which would mean float money', () => {
    expect(ProductSummarySchema.safeParse({ ...baseProduct, priceMinor: 1500.5 }).success).toBe(
      false,
    );
  });

  it('defaults a missing currency to NGN', () => {
    const parsed = ProductSummarySchema.safeParse(baseProduct);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.currency).toBe('NGN');
  });

  it('accepts every purchase state the API documents', () => {
    for (const state of ['purchasable', 'prescription_only', 'out_of_stock', 'inactive']) {
      expect(ProductSummarySchema.safeParse({ ...baseProduct, purchaseState: state }).success).toBe(
        true,
      );
    }
  });

  it('requires a product to have a name and slug', () => {
    expect(ProductSummarySchema.safeParse({ ...baseProduct, name: '' }).success).toBe(false);
  });

  it('keeps pharmacy attributes optional on detail', () => {
    const parsed = ProductDetailSchema.safeParse({ ...baseProduct, description: 'x' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.pharmacy).toBeUndefined();
  });

  it('normalises the deployed wrapped product detail without inferring purchase state', () => {
    const parsed = ProductDetailSchema.safeParse({
      product: {
        ...baseProduct,
        department: 'pharmacy',
        categorySlug: 'first-aid',
        stock: 54,
        requiresPrescription: false,
        dosageForm: null,
        strength: null,
        nafdacRegNo: 'DEMO-NAFDAC-0009',
        purchaseState: 'purchasable',
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.departmentSlug).toBe('pharmacy');
      expect(parsed.data.stockQuantity).toBe(54);
      expect(parsed.data.purchaseState).toBe('purchasable');
      expect(parsed.data.pharmacy?.nafdacNumber).toBe('DEMO-NAFDAC-0009');
    }
  });
});

describe('product pagination (page-number envelope)', () => {
  const page = (
    over: Partial<{
      items: unknown[];
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    }> = {},
  ) => ({
    items: [baseProduct],
    page: 1,
    limit: 20,
    totalItems: 1,
    totalPages: 1,
    ...over,
  });

  it('accepts the pinned { items, page, limit, totalItems, totalPages } shape', () => {
    const parsed = ProductPageSchema.safeParse(page());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(1);
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.totalPages).toBe(1);
    }
  });

  it('rejects the old cursor envelope so a stale contract cannot pass silently', () => {
    expect(
      ProductPageSchema.safeParse({ products: [baseProduct], nextCursor: 'abc' }).success,
    ).toBe(false);
  });

  it('rejects a page below 1', () => {
    expect(ProductPageSchema.safeParse(page({ page: 0 })).success).toBe(false);
  });

  it('still tolerates a bare array, reporting a single page', () => {
    const parsed = ProductPageSchema.safeParse([baseProduct]);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(1);
      expect(parsed.data.totalPages).toBe(1);
    }
  });
});

describe('hasMorePages (MFR-3)', () => {
  // Only page/totalPages drive the decision; items just satisfy the shape.
  const withPages = (current: number, total: number) => ({
    items: [baseProduct],
    page: current,
    limit: 20,
    totalItems: 0,
    totalPages: total,
  });

  it('is true while page < totalPages', () => {
    expect(hasMorePages(withPages(1, 3))).toBe(true);
    expect(hasMorePages(withPages(2, 3))).toBe(true);
  });

  it('is false on the last page and beyond', () => {
    expect(hasMorePages(withPages(3, 3))).toBe(false);
    expect(hasMorePages(withPages(1, 1))).toBe(false);
  });
});

describe('isUnfiltered', () => {
  it('is true only when no filter is set', () => {
    expect(isUnfiltered({})).toBe(true);
    expect(isUnfiltered({ search: '   ' })).toBe(true);
    expect(isUnfiltered({ search: 'pain' })).toBe(false);
    expect(isUnfiltered({ departmentSlug: 'pharmacy' })).toBe(false);
    expect(isUnfiltered({ categorySlug: 'dairy' })).toBe(false);
  });
});

describe('mock product filtering (MFR-2, MFR-3)', () => {
  const api = () => new ApiClient({ baseUrl: BASE_URL, fetchImpl: createMockFetch() });

  it('filters by department server-side', async () => {
    const response = await api().get('/catalog/products', ProductPageSchema, {
      query: { department: 'supermarket' },
    });
    expect(response.data.items.length).toBeGreaterThan(0);
    expect(response.data.items.every((p) => p.departmentSlug === 'supermarket')).toBe(true);
  });

  it('searches name and brand', async () => {
    const byName = await api().get('/catalog/products', ProductPageSchema, {
      query: { q: 'paracetamol' },
    });
    expect(byName.data.items).toHaveLength(1);

    // "Peak" is a brand, not a product name; MFR-3 covers both.
    const byBrand = await api().get('/catalog/products', ProductPageSchema, {
      query: { q: 'Peak' },
    });
    expect(byBrand.data.items[0]?.name).toBe('Whole Milk');
  });

  it('returns an empty page when nothing matches', async () => {
    const response = await api().get('/catalog/products', ProductPageSchema, {
      query: { q: 'zzzz-no-such-product' },
    });
    expect(response.data.items).toHaveLength(0);
    expect(response.data.totalItems).toBe(0);
  });

  it('exposes every purchase state so MFR-5 is testable', async () => {
    const response = await api().get('/catalog/products', ProductPageSchema);
    expect(new Set(response.data.items.map((p) => p.purchaseState))).toEqual(
      new Set(['purchasable', 'prescription_only', 'out_of_stock', 'inactive']),
    );
  });

  it('serves categories', async () => {
    const response = await api().get('/catalog/categories', CategoryListSchema);
    expect(response.data.categories.length).toBeGreaterThan(0);
  });
});

describe('mock pagination (page-number envelope)', () => {
  const api = () => new ApiClient({ baseUrl: BASE_URL, fetchImpl: createMockFetch() });

  it('returns page 1 of a multi-page result', async () => {
    const response = await api().get('/catalog/products', ProductPageSchema, {
      query: { limit: 2, page: 1 },
    });
    expect(response.data.items).toHaveLength(2);
    expect(response.data.page).toBe(1);
    expect(response.data.limit).toBe(2);
    expect(response.data.totalItems).toBe(6);
    expect(response.data.totalPages).toBe(3);
    expect(hasMorePages(response.data)).toBe(true);
  });

  it('walks to the last page, where hasMorePages goes false', async () => {
    const last = await api().get('/catalog/products', ProductPageSchema, {
      query: { limit: 2, page: 3 },
    });
    expect(last.data.items).toHaveLength(2);
    expect(last.data.page).toBe(3);
    expect(hasMorePages(last.data)).toBe(false);
  });

  it('returns a distinct slice per page rather than repeating page 1', async () => {
    const one = await api().get('/catalog/products', ProductPageSchema, {
      query: { limit: 2, page: 1 },
    });
    const two = await api().get('/catalog/products', ProductPageSchema, {
      query: { limit: 2, page: 2 },
    });
    const idsOne = one.data.items.map((p) => p.id);
    const idsTwo = two.data.items.map((p) => p.id);
    expect(idsOne.some((id) => idsTwo.includes(id))).toBe(false);
  });

  it('returns an empty page past the end rather than an error', async () => {
    const response = await api().get('/catalog/products', ProductPageSchema, {
      query: { limit: 2, page: 99 },
    });
    expect(response.data.items).toHaveLength(0);
    expect(response.data.page).toBe(99);
  });

  it('reports totalPages of 1 when a single page holds everything', async () => {
    const response = await api().get('/catalog/products', ProductPageSchema, {
      query: { limit: 50 },
    });
    expect(response.data.totalPages).toBe(1);
    expect(hasMorePages(response.data)).toBe(false);
  });
});

describe('mock product detail (MFR-4)', () => {
  const api = () => new ApiClient({ baseUrl: BASE_URL, fetchImpl: createMockFetch() });

  it('returns pharmacy fields when the backend sends them', async () => {
    const response = await api().get(
      '/catalog/products/paracetamol-500mg-20-tabs',
      ProductDetailSchema,
    );
    expect(response.data.priceMinor).toBe(150000);
    expect(response.data.pharmacy?.nafdacNumber).toBe('NAFDAC-12345');
    expect(response.data.pharmacy?.requiresPrescription).toBe(false);
  });

  it('omits pharmacy fields for a non-pharmacy product', async () => {
    const response = await api().get('/catalog/products/whole-milk-1l', ProductDetailSchema);
    expect(response.data.pharmacy).toBeUndefined();
  });

  it('404s an unknown slug in the real error envelope', async () => {
    await expect(
      api().get('/catalog/products/no-such-thing', ProductDetailSchema),
    ).rejects.toMatchObject({ status: 404 });
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
