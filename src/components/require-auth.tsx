import { useEffect, type ReactNode } from 'react';
import { router, usePathname } from 'expo-router';

import { LoadingState } from '@/components/screen';
import { useAuthSession } from '@/features/auth';

/**
 * Gate for a screen that needs a session (AGENTS.md 8).
 *
 * Behaviour, in order:
 *
 * 1. While the session is still being restored, render nothing. Redirecting then
 *    would bounce a signed-in user to sign-in on every cold start.
 * 2. When signed out, record where the user was heading and send them to sign-in.
 *    `useEffect` (not a render-time redirect) so navigation happens after commit
 *    rather than during render.
 * 3. When signed in, render the screen.
 *
 * Crucially this renders **no children** while signed out, so a protected screen
 * never mounts and therefore never issues an authenticated request with no token.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, requireSignIn } = useAuthSession();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'signed-out') return;

    // A route path only, never a token or any sensitive value (AGENTS.md 3.5).
    requireSignIn(pathname);
    router.replace('/sign-in');
  }, [pathname, requireSignIn, status]);

  if (status === 'restoring') return <LoadingState label="Checking your session" />;
  if (status === 'signed-out') return null;

  return <>{children}</>;
}
