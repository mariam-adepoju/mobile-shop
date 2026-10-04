import { TokenManager } from '@/lib/api';

import { getAuth0Client } from './auth0-client';

/**
 * Bridges the Auth0 credentials manager to the API client (AGENTS.md 3.4, 6.4).
 *
 * The SDK owns refresh tokens and never lets them leave secure storage; this
 * adapter only exposes the *access token* the API needs. `refreshAccessToken`
 * passes `forceRefresh` so a 401 is answered with a genuinely new token rather
 * than the stale one the server just rejected.
 *
 * `minTtl: 0` makes the SDK hand back a currently-valid token without a network
 * round trip on the common path.
 */
export function createAuth0TokenManager(): TokenManager {
  return new TokenManager({
    getAccessToken: async () => {
      const credentials = await getAuth0Client().credentialsManager.getCredentials(
        // Request the same scopes as sign-in so a refreshed token stays
        // equivalent to the one Auth0 issued at login.
        undefined,
        0,
      );
      return credentials.accessToken;
    },

    refreshAccessToken: async () => {
      const credentials = await getAuth0Client().credentialsManager.getCredentials(
        undefined,
        0,
        undefined,
        // The whole point: force a new token even though the cached one has not
        // expired, because the server rejected it.
        true,
      );
      return credentials.accessToken;
    },
  });
}
