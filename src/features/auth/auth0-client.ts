import Auth0 from 'react-native-auth0';

import { assertAuth0Configured, getConfig, type AppConfig } from '@/lib/config';

/**
 * The Auth0 client (AGENTS.md 8).
 *
 * Authorization Code + PKCE in the system browser. No implicit flow, no
 * embedded WebView, and no client secret: a native app cannot keep one
 * (PRD MFR-7).
 *
 * Domain and client ID are public identifiers, so `EXPO_PUBLIC_*` is correct
 * for them. They are inlined at build time, so the client is created once and
 * memoised.
 */
let client: Auth0 | undefined;

export function getAuth0Client(): Auth0 {
  if (client !== undefined) return client;

  const { domain, clientId } = assertAuth0Configured();
  client = new Auth0({ domain, clientId });
  return client;
}

/**
 * Scopes requested at sign-in (PRD 8.2, MFR-7).
 *
 * `offline_access` is what yields a refresh token, which is the only reason the
 * SDK can renew silently. `openid profile email` are required for the local user
 * row and for the Account screen.
 */
export const AUTH_SCOPES = 'openid profile email offline_access';

/**
 * Google is the required connection (PRD MFR-7).
 *
 * The audience is the Daywell API, so Auth0 issues an **access token** for it.
 * The ID token is never sent to our API (AGENTS.md 3.4).
 */
export function buildSignInParams(config: AppConfig = getConfig()): {
  readonly audience: string;
  readonly scope: string;
  readonly connection: string;
} {
  const { audience } = assertAuth0Configured(config);
  return { audience, scope: AUTH_SCOPES, connection: 'google-oauth2' };
}
