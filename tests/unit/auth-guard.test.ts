import { resolvePendingRoute, type SessionStatus } from '@/features/auth/session';

// The provider module imports `expo-router` and the native Auth0 SDK at module
// load. Neither can run under Jest and neither takes part in the resume rule, so
// both are stubbed to keep this a pure unit test of the decision. `jest.mock` is
// hoisted above the imports by the transformer, so declaring it here still
// applies to the module under test.
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));
jest.mock('react-native-auth0', () => ({ __esModule: true, default: jest.fn() }));

describe('resolvePendingRoute (AGENTS.md 8)', () => {
  const status = (value: SessionStatus) => value;

  it('resumes the stored route once the user is signed in', () => {
    expect(resolvePendingRoute({ status: status('signed-in'), pendingRoute: '/cart' })).toEqual({
      route: '/cart',
      shouldClear: true,
    });
  });

  it('does NOT resume while signed out, which would show a protected screen', () => {
    expect(resolvePendingRoute({ status: status('signed-out'), pendingRoute: '/cart' })).toEqual({
      route: undefined,
      shouldClear: false,
    });
  });

  it('does not resume while the session is still restoring', () => {
    // Redirecting here would bounce a signed-in user to sign-in on every cold
    // start, before restore has had a chance to finish.
    expect(resolvePendingRoute({ status: status('restoring'), pendingRoute: '/cart' })).toEqual({
      route: undefined,
      shouldClear: false,
    });
  });

  it('treats no stored route as nothing to do, not an error', () => {
    expect(resolvePendingRoute({ status: status('signed-in'), pendingRoute: undefined })).toEqual({
      route: undefined,
      shouldClear: false,
    });
    expect(resolvePendingRoute({ status: status('signed-in'), pendingRoute: '' })).toEqual({
      route: undefined,
      shouldClear: false,
    });
  });

  it('clears the route once consumed, so a re-render cannot navigate twice', () => {
    const first = resolvePendingRoute({ status: status('signed-in'), pendingRoute: '/orders' });
    expect(first.shouldClear).toBe(true);

    // Simulates the effect running again after clearPendingRoute() took effect.
    const second = resolvePendingRoute({
      status: status('signed-in'),
      pendingRoute: undefined,
    });
    expect(second.route).toBeUndefined();
  });

  it('resumes any protected route, not just the first one requested', () => {
    for (const route of ['/cart', '/orders', '/account']) {
      expect(resolvePendingRoute({ status: status('signed-in'), pendingRoute: route }).route).toBe(
        route,
      );
    }
  });
});
