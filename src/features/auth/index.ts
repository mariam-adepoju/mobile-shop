/**
 * Auth feature (AGENTS.md 5).
 *
 * The Auth0 client, the session, and the token bridge. Screens import from here
 * and never touch the SDK directly.
 */
export { AUTH_SCOPES, buildSignInParams, getAuth0Client } from './auth0-client';
export { createAuth0TokenManager } from './token-manager';
export {
  AuthSessionProvider,
  useAuthSession,
  type AuthSession,
  type SessionStatus,
} from './session';
