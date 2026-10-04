import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { getApiClient } from '@/lib/api';

import {
  CategoryListSchema,
  DepartmentListSchema,
  PRODUCTS_PAGE_SIZE,
  ProductDetailSchema,
  ProductPageSchema,
  type Category,
  type Department,
  type ProductDetail,
  type ProductFilters,
  type ProductSummary,
} from './schemas';

/**
 * Query key for the department list (PRD 6.3: the cart has one key; so does
 * every other server collection).
 */
export const departmentsKey = ['catalog', 'departments'] as const;

/**
 * `GET /catalog/departments` (PRD 4.1).
 *
 * Public, so no token is attached and no sign-in gate applies (PRD 2).
 */
export function fetchDepartments(signal?: AbortSignal): Promise<Department[]> {
  return getApiClient()
    .get('/catalog/departments', DepartmentListSchema, { signal })
    .then((response) => response.data.departments);
}

export function departmentsQueryOptions() {
  return queryOptions({
    queryKey: departmentsKey,
    queryFn: ({ signal }) => fetchDepartments(signal),
  });
}

export type { Department };

/* ------------------------------------------------------------------ *
 * Categories (PRD 4.1, MFR-2)
 * ------------------------------------------------------------------ */

export const categoriesKey = (departmentSlug?: string) =>
  ['catalog', 'categories', departmentSlug ?? 'all'] as const;

/** `GET /catalog/categories`, optionally narrowed to one department. */
export function fetchCategories(
  departmentSlug?: string,
  signal?: AbortSignal,
): Promise<Category[]> {
  return getApiClient()
    .get('/catalog/categories', CategoryListSchema, {
      signal,
      query: { department: departmentSlug },
    })
    .then((response) => response.data.categories);
}

export function categoriesQueryOptions(departmentSlug?: string) {
  return queryOptions({
    queryKey: categoriesKey(departmentSlug),
    queryFn: ({ signal }) => fetchCategories(departmentSlug, signal),
  });
}

/* ------------------------------------------------------------------ *
 * Products (PRD 4.1, MFR-2, MFR-3)
 * ------------------------------------------------------------------ */

/** Query key per filter combination; filters are part of the identity. */
export const productsKey = (filters: ProductFilters) =>
  [
    'catalog',
    'products',
    filters.departmentSlug ?? 'all',
    filters.categorySlug ?? 'all',
    (filters.search ?? '').trim().toLowerCase(),
  ] as const;

export interface ProductPageResult {
  readonly products: ProductSummary[];
  readonly nextCursor: string | null;
}

/**
 * One page of `GET /catalog/products`.
 *
 * Filtering and search are the server's job: the raw term and slugs go out as
 * query params and nothing is matched locally (MFR-3, AGENTS.md 3.2).
 */
export function fetchProductsPage(
  filters: ProductFilters,
  cursor: string | undefined,
  signal?: AbortSignal,
): Promise<ProductPageResult> {
  const search = (filters.search ?? '').trim();

  return getApiClient()
    .get('/catalog/products', ProductPageSchema, {
      signal,
      query: {
        department: filters.departmentSlug,
        category: filters.categorySlug,
        // `q` is the backend's documented search param name; see
        // docs/api-contract-notes.md.
        q: search.length > 0 ? search : undefined,
        cursor,
        limit: PRODUCTS_PAGE_SIZE,
      },
    })
    .then((response) => response.data);
}

/**
 * Paged product list (MFR-3: "paginate results (infinite scroll or load more)").
 *
 * Infinite rather than an explicit page number so the cursor the backend
 * returns is passed back verbatim and no total count has to be assumed.
 */
export function productsQueryOptions(filters: ProductFilters) {
  return infiniteQueryOptions({
    queryKey: productsKey(filters),
    queryFn: ({ pageParam, signal }) => fetchProductsPage(filters, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/* ------------------------------------------------------------------ *
 * Product detail (PRD 4.1, MFR-4)
 * ------------------------------------------------------------------ */

export const productDetailKey = (slug: string) => ['catalog', 'product', slug] as const;

/** `GET /catalog/products/{slug}`. The slug is URL-encoded at the boundary. */
export function fetchProduct(slug: string, signal?: AbortSignal): Promise<ProductDetail> {
  return getApiClient()
    .get(`/catalog/products/${encodeURIComponent(slug)}`, ProductDetailSchema, { signal })
    .then((response) => response.data);
}

export function productQueryOptions(slug: string) {
  return queryOptions({
    queryKey: productDetailKey(slug),
    queryFn: ({ signal }) => fetchProduct(slug, signal),
  });
}

/** Flatten an infinite product result into one list for rendering. */
export function flattenPages(data: { pages: ProductPageResult[] } | undefined): ProductSummary[] {
  return data?.pages.flatMap((page) => page.products) ?? [];
}

export type { Category, ProductDetail, ProductFilters, ProductSummary };
