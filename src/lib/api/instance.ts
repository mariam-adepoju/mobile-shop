import { logger } from '@/lib/logger';
import { getConfig } from '@/lib/config';
import { createMockFetch } from '@/mocks';

import { ApiClient, type FetchLike } from './client';
import type { TokenManager } from './token-manager';

/** Handlers the app installs once it has an auth session (M4). */
interface SessionHooks {
  onSessionExpired?: () => void;
}

let sessionHooks: SessionHooks = {};

/** Registered by the auth provider in M4 so the client can expire a session. */
export function setSessionHooks(hooks: SessionHooks): void {
  sessionHooks = hooks;
}

/** The Auth0-backed token manager, installed in M4. */
let tokenManager: TokenManager | undefined;

/** Installed by the auth provider in M4. */
export function setTokenManager(manager: TokenManager | undefined): void {
  tokenManager = manager;
}

function resolveFetch(): FetchLike {
  const config = getConfig();
  if (config.mode === 'mock') {
    logger.info('api.mode', { mode: 'mock' });
    // A small delay makes the skeleton state visible, as a real network would.
    return createMockFetch({ latencyMs: 150 });
  }
  // Injected rather than referenced so the `no-restricted-globals` rule only
  // has to be relaxed inside src/lib/api (AGENTS.md 6).
  return (...args) => globalThis.fetch(...args);
}

let shared: ApiClient | undefined;

/**
 * The app-wide API client (AGENTS.md 6).
 *
 * Reads the base URL from validated config at construction, so a bad
 * environment fails once, loudly, rather than on the first request.
 */
export function getApiClient(): ApiClient {
  if (!shared) {
    const config = getConfig();
    shared = new ApiClient({
      baseUrl: config.apiBaseUrl,
      fetchImpl: resolveFetch(),
      get onSessionExpired() {
        return sessionHooks.onSessionExpired;
      },
      get tokens() {
        return tokenManager;
      },
    });
  }
  return shared;
}

/** Test-only: drop the cached client so each suite starts clean. */
export function resetApiClientForTests(): void {
  shared = undefined;
  tokenManager = undefined;
  sessionHooks = {};
}
