import { QueryClient } from '@tanstack/react-query';

import { ApiClientError, ContractError } from '@/lib/api';

/**
 * The single TanStack Query client (AGENTS.md 5).
 *
 * All server state lives here; nothing is duplicated into component state.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The catalog is public and changes rarely; showing a cached value
        // first makes the app feel instant (PRD 13).
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: false, // The ApiClient already retries bounded, idempotent GETs.
        refetchOnWindowFocus: true,
      },
      mutations: {
        // A mutation is never silently repeated; the caller owns retries.
        retry: false,
      },
    },
  });
}

let shared: QueryClient | undefined;

/**
 * The app-wide client.
 *
 * Deliberately not persisted to disk: AGENTS.md 3.5 and PRD 12 forbid writing
 * cart, order, address or profile data to unencrypted storage.
 */
export function getQueryClient(): QueryClient {
  shared ??= createQueryClient();
  return shared;
}

/** Test-only: drop the cached client so each suite starts clean. */
export function resetQueryClientForTests(): void {
  shared?.clear();
  shared = undefined;
}

/**
 * True when an error is worth offering a "Try again" button for.
 *
 * A contract mismatch or a dead-end business rule will fail identically on
 * retry, so the UI should explain rather than loop (DESIGN.md 6).
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ContractError) return false;
  return error instanceof ApiClientError;
}
