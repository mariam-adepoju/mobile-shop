import { ApiClientError, type FetchLike } from '@/lib/api';
import { PRODUCTS_PAGE_SIZE } from '@/features/catalog';

import {
  categoriesResponse,
  departmentsBareArrayResponse,
  departmentsResponse,
  findProductFixture,
  healthResponse,
  meResponse,
  productsResponse,
} from './fixtures';

const BARE_ARRAY_ROUTE = /\/catalog\/departments$/;
const CATEGORIES_ROUTE = /\/catalog\/categories$/;
const PRODUCTS_ROUTE = /\/catalog\/products$/;
const PRODUCT_DETAIL_ROUTE = /^\/catalog\/products\/([^/?]+)$/;

/** Fixture bodies keyed by the part of the path after the API base. */
const ROUTES: readonly {
  readonly match: RegExp;
  readonly status: number;
  readonly body: unknown;
}[] = [
  { match: /\/health$/, status: 200, body: healthResponse },
  { match: /\/me$/, status: 200, body: meResponse },
  { match: /\/catalog\/departments$/, status: 200, body: departmentsResponse },
  { match: CATEGORIES_ROUTE, status: 200, body: categoriesResponse },
  { match: PRODUCTS_ROUTE, status: 200, body: productsResponse },
];

export interface MockFetchOptions {
  /**
   * Return a bare array instead of `{ departments: [...] }` so both accepted
   * shapes stay covered.
   */
  readonly useBareArray?: boolean;
  /** Artificial latency, so loading states are visible in mock mode. */
  readonly latencyMs?: number;
}

/**
 * A `fetch` stand-in that serves the fixtures.
 *
 * Only the routes in {@link ROUTES} are served; anything else 404s with the
 * real error envelope, so an unimplemented endpoint is visible immediately
 * rather than silently returning empty data.
 */
export function createMockFetch(options: MockFetchOptions = {}): FetchLike {
  const latencyMs = options.latencyMs ?? 0;

  return async (url) => {
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    // Route matching uses the path only; the query string is still available to
    // `filterProducts` below, which applies `department`, `category`, `q` and
    // `limit`. Without this split `\/catalog\/products$` would never match a
    // filtered request.
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? '';
    const json = (status: number, body: unknown) => ({
      status,
      ok: status >= 200 && status < 300,
      headers: { 'content-type': 'application/json' },
      text: async () => JSON.stringify(body),
    });

    // Product detail is matched first: `/catalog/products/{slug}` would
    // otherwise be swallowed by the bare products route.
    const detail = PRODUCT_DETAIL_ROUTE.exec(path);
    if (detail) {
      const body = findProductFixture(decodeURIComponent(detail[1] ?? ''));
      return body ? json(200, body) : json(404, notFound(path));
    }

    if (PRODUCTS_ROUTE.test(path)) {
      return json(200, filterProducts(url));
    }

    const route = ROUTES.find((candidate) => candidate.match.test(path));
    if (!route) return json(404, notFound(path));

    const body =
      options.useBareArray && BARE_ARRAY_ROUTE.test(path)
        ? departmentsBareArrayResponse
        : route.body;

    return json(route.status, body);
  };
}

/** 404 in the real error envelope, so the client's error path is exercised. */
function notFound(path: string): unknown {
  return { error: { code: 'NOT_FOUND', message: `No mock route for ${path}` } };
}

/**
 * Apply the filter query params the app sends.
 *
 * The real server does the matching and paging; the mock must respect
 * `department`, `category`, `q`, `page` and `limit`, or the filter and
 * pagination UI would appear to do nothing in mock mode. The envelope mirrors
 * the backend contract: `{ items, page, limit, totalItems, totalPages }`.
 */
function filterProducts(url: string): unknown {
  const { products } = productsResponse.data as {
    products: Record<string, unknown>[];
  };
  const params = new URLSearchParams(url.split('?')[1] ?? '');

  const department = params.get('department');
  const category = params.get('category');
  const search = (params.get('q') ?? '').trim().toLowerCase();
  // Page is 1-based; limit falls back to the schema's page size.
  const limit = Math.max(Number(params.get('limit') ?? 0) || PRODUCTS_PAGE_SIZE, 1);
  const page = Math.max(Number(params.get('page') ?? 1) || 1, 1);

  const matched = products.filter((product) => {
    if (department && product.departmentSlug !== department) return false;
    if (category && product.categorySlug !== category) return false;
    if (search.length > 0) {
      // MFR-3: search covers name and brand, matching the documented scope.
      const name = String(product.name ?? '').toLowerCase();
      const brand = String(product.brand ?? '').toLowerCase();
      if (!name.includes(search) && !brand.includes(search)) return false;
    }
    return true;
  });

  // A request past the last page is empty rather than an error, matching a real
  // paginated endpoint.
  const start = (page - 1) * limit;
  const totalPages = Math.max(Math.ceil(matched.length / limit), 1);

  return {
    data: {
      items: matched.slice(start, start + limit),
      page,
      limit,
      totalItems: matched.length,
      totalPages,
    },
  };
}

/** True when any route exists for this path. Test helper. */
export function hasMockRoute(url: string): boolean {
  const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? '';
  return PRODUCT_DETAIL_ROUTE.test(path) || ROUTES.some((route) => route.match.test(path));
}

export { ApiClientError };
