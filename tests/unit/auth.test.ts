import { AUTH_SCOPES, buildSignInParams } from '@/features/auth/auth0-client';
import { ConfigError, parseConfig } from '@/lib/config';

/**
 * These cover the sign-in parameter contract against PRD 8.2 / MFR-7 rather than
 * the SDK itself: the SDK is native code and cannot run under Jest.
 *
 * `jest.mock` keeps `react-native-auth0` out of the module graph so importing the
 * feature does not pull in native bindings.
 */
jest.mock('react-native-auth0', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// `getConfig()` memoises the env when this module is first imported, so assigning
// `process.env` inside a test cannot change it. Going through `parseConfig` and
// passing the result in keeps the real validation in the path, instead of
// mocking the module under test's own dependency.
const configured = parseConfig({
  EXPO_PUBLIC_AUTH0_DOMAIN: 'tenant.eu.auth0.com',
  EXPO_PUBLIC_AUTH0_CLIENT_ID: 'abc123clientid',
  EXPO_PUBLIC_AUTH0_AUDIENCE: 'https://api.daywell.com',
});

const notConfigured = parseConfig({
  EXPO_PUBLIC_AUTH0_DOMAIN: '',
  EXPO_PUBLIC_AUTH0_CLIENT_ID: '',
  EXPO_PUBLIC_AUTH0_AUDIENCE: '',
});

describe('sign-in parameters (PRD 8.2, MFR-7)', () => {
  it('requests the API audience so Auth0 issues an access token, not just an ID token', () => {
    // MFR-8: the audience is what makes the token an API access token rather
    // than an ID token, and the ID token must never be sent to the API.
    expect(buildSignInParams(configured).audience).toBe('https://api.daywell.com');
  });

  it('requests openid profile email and offline_access', () => {
    const { scope } = buildSignInParams(configured);
    expect(scope).toBe('openid profile email offline_access');
    // offline_access is what produces the refresh token that makes silent
    // session restore possible.
    expect(scope).toContain('offline_access');
  });

  it('uses the Google connection, which is the required one', () => {
    expect(buildSignInParams(configured).connection).toBe('google-oauth2');
  });

  it('keeps the scope list in one exported constant so sign-in cannot drift', () => {
    expect(AUTH_SCOPES).toBe('openid profile email offline_access');
  });

  it('refuses to build parameters when Auth0 is not configured', () => {
    expect(() => buildSignInParams(notConfigured)).toThrow(ConfigError);
    expect(() => buildSignInParams(notConfigured)).toThrow(/EXPO_PUBLIC_AUTH0_DOMAIN/);
  });
});
