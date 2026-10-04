import { ApiClientError, type FetchLike } from '@/lib/api';

import { departmentsBareArrayResponse, departmentsResponse, healthResponse } from './fixtures';

/** Fixture bodies keyed by the part of the path after the API base. */
const ROUTES: readonly {
  readonly match: RegExp;
  readonly status: number;
  readonly body: unknown;
}[] = [
  { match: /\/health$/, status: 200, body: healthResponse },
  { match: /\/catalog\/departments$/, status: 200, body: departmentsResponse },
];

/** Alternate shape for the departments route, toggled by `useBareArray`. */
const BARE_ARRAY_ROUTE = /\/catalog\/departments$/;

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

    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const route = ROUTES.find((candidate) => candidate.match.test(path));

    if (!route) {
      return {
        status: 404,
        ok: false,
        headers: { 'content-type': 'application/json' },
        text: async () =>
          JSON.stringify({
            error: { code: 'NOT_FOUND', message: `No mock route for ${path}` },
          }),
      };
    }

    const body =
      options.useBareArray && BARE_ARRAY_ROUTE.test(path)
        ? departmentsBareArrayResponse
        : route.body;

    return {
      status: route.status,
      ok: route.status >= 200 && route.status < 300,
      headers: { 'content-type': 'application/json' },
      text: async () => JSON.stringify(body),
    };
  };
}

/** True when any route exists for this path. Test helper. */
export function hasMockRoute(url: string): boolean {
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  return ROUTES.some((route) => route.match.test(path));
}

export { ApiClientError };
