import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { type ReactNode } from 'react';

import { logger } from '@/lib/logger';
import { setSessionHooks } from '@/lib/api';
import { getConfig } from '@/lib/config';

import { AUTH_SCOPES, buildSignInParams, getAuth0Client } from './auth0-client';

/**
 * Session state (AGENTS.md 5, 8).
 *
 * The app keeps exactly two pieces of client state for auth: whether a session
 * exists, and the route the user was trying to reach before being asked to sign
 * in. Everything else about the user is server state from `GET /me`.
 *
 * Tokens never enter this module's state. They stay inside the SDK's
 * Keychain/Keystore-backed credentials manager (AGENTS.md 3.5), which is why
 * nothing here can log or persist them.
 */

export type SessionStatus = 'restoring' | 'signed-in' | 'signed-out';

export interface AuthSession {
  readonly status: SessionStatus;
  /** True when Auth0 is not configured at all; sign-in is then unavailable. */
  readonly configured: boolean;
  readonly error: string | null;
  readonly pendingRoute: string | undefined;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Records where to return after a successful sign-in (a path, never data). */
  requireSignIn: (route: string) => void;
  clearPendingRoute: () => void;
}

const AuthSessionContext = createContext<AuthSession | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { auth0 } = getConfig();

  const [status, setStatus] = useState<SessionStatus>('restoring');
  const [error, setError] = useState<string | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | undefined>(undefined);

  // Restore silently on cold start (AGENTS.md 8). The SDK stores credentials in
  // secure storage and refreshes them itself when the access token has expired.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!auth0.configured) {
        // No tenant values: the app still browses the catalog signed out.
        if (!cancelled) setStatus('signed-out');
        return;
      }

      try {
        // Android can kill the app mid-login; the SDK can finish that exchange.
        const recovered = await getAuth0Client().webAuth.resumeSession();
        const hasCredentials = await getAuth0Client().credentialsManager.hasValidCredentials();

        if (cancelled) return;
        setStatus(recovered !== null || hasCredentials ? 'signed-in' : 'signed-out');
      } catch (restoreError) {
        // A corrupt credential store must not brick the app; start signed out.
        logger.warn('auth.restore-failed', { type: 'unknown' });
        if (!cancelled) {
          setStatus('signed-out');
          setError('We could not restore your session. Please sign in again.');
        }
        void restoreError;
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [auth0.configured]);

  const signIn = useCallback(async () => {
    setError(null);

    if (!auth0.configured) {
      setError('Sign-in is not available in this build.');
      return;
    }

    try {
      const { audience, scope, connection } = buildSignInParams();
      const credentials = await getAuth0Client().webAuth.authorize({
        audience,
        scope,
        connection,
      });

      // Persist so the session survives a cold start. The tokens themselves stay
      // in secure storage; nothing about them reaches React state (AGENTS.md 3.5).
      await getAuth0Client().credentialsManager.saveCredentials(credentials);
      setStatus('signed-in');
      setError(null);
    } catch (signInError) {
      logger.warn('auth.sign-in-failed', { type: 'unknown' });
      setStatus('signed-out');
      setError('Sign-in was not completed. Please try again.');
      void signInError;
    }
  }, [auth0.configured]);

  const signOut = useCallback(async () => {
    try {
      await getAuth0Client().webAuth.clearSession();
      // Clears the SDK's Keychain/Keystore credentials (AGENTS.md 8).
      await getAuth0Client().credentialsManager.clearCredentials();
    } catch (signOutError) {
      // Even if the network call fails, local credentials must still be dropped.
      logger.warn('auth.sign-out-failed', { type: 'unknown' });
      void signOutError;
    } finally {
      // Wipe every cached response, including personal data, then drop the
      // session. Order matters: clearing first means no observer can render the
      // previous user's data during teardown.
      queryClient.clear();
      setStatus('signed-out');
      setError(null);
    }
  }, [queryClient]);

  const requireSignIn = useCallback((route: string) => {
    // A route path only. Never store a token or any other sensitive value here.
    setPendingRoute(route);
  }, []);

  const clearPendingRoute = useCallback(() => {
    setPendingRoute(undefined);
  }, []);

  // After a successful sign-in, send the user back to where they were going.
  // Navigating from the provider (rather than each screen) means the resume
  // happens once, whichever screen asked for it.
  useEffect(() => {
    const { route } = resolvePendingRoute({ status, pendingRoute });
    if (route === undefined) return;

    // Clear first, then navigate. `clearPendingRoute` is deferred so the
    // synchronous state update does not cascade a render inside this effect
    // (React Compiler's `set-state-in-effect` rule), while still guaranteeing the
    // route is consumed exactly once.
    queueMicrotask(() => {
      clearPendingRoute();
      router.replace(route as Href);
    });
  }, [clearPendingRoute, pendingRoute, status]);

  // A 401 that survives one refresh means the session is genuinely unusable
  // (AGENTS.md 6.4). Sign out so the guard sends the user to sign-in instead of
  // looping on failing requests. Registered here because it needs `signOut`.
  useEffect(() => {
    setSessionHooks({
      onSessionExpired: () => {
        void signOut();
      },
    });
    return () => setSessionHooks({});
  }, [signOut]);

  const value = useMemo<AuthSession>(
    () => ({
      status,
      configured: auth0.configured,
      error,
      pendingRoute,
      signIn,
      signOut,
      requireSignIn,
      clearPendingRoute,
    }),
    [
      auth0.configured,
      clearPendingRoute,
      error,
      pendingRoute,
      requireSignIn,
      signIn,
      signOut,
      status,
    ],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

/**
 * Decide what to do once the session status changes (AGENTS.md 8).
 *
 * Kept as a pure function so the resume behaviour is unit-testable without
 * mounting a navigator, and so the rule lives in one place:
 *
 * - `pendingRoute` holds a **route path only**: never a token, a query value, or
 *   anything else sensitive (AGENTS.md 3.5).
 * - Resume only on the transition to `signed-in`. Resuming earlier would send a
 *   signed-out user to a screen that needs a token.
 * - A missing route is not an error; the user simply lands on the default home.
 * - The route is cleared once consumed, so a re-render cannot navigate twice.
 */
export function resolvePendingRoute(input: {
  readonly status: SessionStatus;
  readonly pendingRoute: string | undefined;
}): { readonly route: string | undefined; readonly shouldClear: boolean } {
  if (input.status !== 'signed-in') return { route: undefined, shouldClear: false };
  if (input.pendingRoute === undefined || input.pendingRoute.length === 0) {
    return { route: undefined, shouldClear: false };
  }
  return { route: input.pendingRoute, shouldClear: true };
}

/** Throws outside the provider, which would be a wiring bug, not a user state. */
export function useAuthSession(): AuthSession {
  const session = useContext(AuthSessionContext);
  if (session === null) {
    throw new Error('useAuthSession must be used inside <AuthSessionProvider>.');
  }
  return session;
}

export { AUTH_SCOPES };
