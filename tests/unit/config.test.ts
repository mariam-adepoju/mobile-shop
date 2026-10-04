import {
  API_TIMEOUT_MS,
  CART_BADGE_POLL_INTERVAL_MS,
  ConfigError,
  assertAuth0Configured,
  parseConfig,
  type RawEnv,
} from '@/lib/config';

const LIVE_ENV: RawEnv = {
  EXPO_PUBLIC_API_MODE: 'live',
  EXPO_PUBLIC_API_BASE_URL: 'https://daywell-shop.vercel.app/api/v1',
  EXPO_PUBLIC_AUTH0_DOMAIN: 'daywell.eu.auth0.com',
  EXPO_PUBLIC_AUTH0_CLIENT_ID: 'abc123CLIENTIDvalue',
  EXPO_PUBLIC_AUTH0_AUDIENCE: 'https://api.daywell.com',
  EXPO_PUBLIC_APP_SCHEME: 'daywell',
};

describe('parseConfig', () => {
  it('parses a complete live environment', () => {
    const config = parseConfig(LIVE_ENV, { isRelease: false });

    expect(config.mode).toBe('live');
    expect(config.apiBaseUrl).toBe('https://daywell-shop.vercel.app/api/v1');
    expect(config.appScheme).toBe('daywell');
    expect(config.auth0).toEqual({
      domain: 'daywell.eu.auth0.com',
      clientId: 'abc123CLIENTIDvalue',
      audience: 'https://api.daywell.com',
      configured: true,
    });
  });

  it('defaults to mock mode so the app boots before the backend exists', () => {
    const config = parseConfig({}, { isRelease: false });

    expect(config.mode).toBe('mock');
    expect(config.apiBaseUrl).toBe('');
    expect(config.appScheme).toBe('daywell');
    expect(config.auth0.configured).toBe(false);
  });

  it('strips trailing slashes so request paths never double up', () => {
    const config = parseConfig(
      { ...LIVE_ENV, EXPO_PUBLIC_API_BASE_URL: 'https://example.test/api/v1///' },
      { isRelease: false },
    );

    expect(config.apiBaseUrl).toBe('https://example.test/api/v1');
  });

  it('trims surrounding whitespace from every value', () => {
    const config = parseConfig(
      { ...LIVE_ENV, EXPO_PUBLIC_API_BASE_URL: '  https://example.test/api/v1  ' },
      { isRelease: false },
    );

    expect(config.apiBaseUrl).toBe('https://example.test/api/v1');
  });

  it('rejects an unknown API mode', () => {
    expect(() =>
      parseConfig({ EXPO_PUBLIC_API_MODE: 'staging' as 'mock' }, { isRelease: false }),
    ).toThrow(ConfigError);
  });

  it('requires a base URL in live mode', () => {
    expect(() => parseConfig({ EXPO_PUBLIC_API_MODE: 'live' }, { isRelease: false })).toThrow(
      /EXPO_PUBLIC_API_BASE_URL is required/,
    );
  });

  it('rejects a malformed base URL', () => {
    expect(() =>
      parseConfig(
        { EXPO_PUBLIC_API_MODE: 'live', EXPO_PUBLIC_API_BASE_URL: 'not-a-url' },
        { isRelease: false },
      ),
    ).toThrow(/not a valid URL/);
  });

  it('allows http in development so a local backend can be used', () => {
    const config = parseConfig(
      { EXPO_PUBLIC_API_MODE: 'live', EXPO_PUBLIC_API_BASE_URL: 'http://localhost:3000/api/v1' },
      { isRelease: false },
    );

    expect(config.apiBaseUrl).toBe('http://localhost:3000/api/v1');
  });

  it('rejects http in a release build (AGENTS.md 11)', () => {
    expect(() =>
      parseConfig(
        { EXPO_PUBLIC_API_MODE: 'live', EXPO_PUBLIC_API_BASE_URL: 'http://example.test/api/v1' },
        { isRelease: true },
      ),
    ).toThrow(/Release builds require an https/);
  });

  it.each(['Daywell', '1daywell', 'day well', 'daywell://', ''])(
    'rejects the invalid app scheme %p',
    (scheme) => {
      expect(() => parseConfig({ ...LIVE_ENV, EXPO_PUBLIC_APP_SCHEME: scheme })).toThrow(
        /EXPO_PUBLIC_APP_SCHEME/,
      );
    },
  );

  it('rejects an Auth0 domain that carries a scheme or path', () => {
    expect(() =>
      parseConfig({ ...LIVE_ENV, EXPO_PUBLIC_AUTH0_DOMAIN: 'https://x.auth0.com' }),
    ).toThrow(/bare host/);
  });

  it('rejects an Auth0 audience that is not a URI', () => {
    expect(() => parseConfig({ ...LIVE_ENV, EXPO_PUBLIC_AUTH0_AUDIENCE: 'my-api' })).toThrow(
      /must be a URI/,
    );
  });

  it('reports every problem at once instead of one at a time', () => {
    try {
      parseConfig(
        { EXPO_PUBLIC_API_MODE: 'live', EXPO_PUBLIC_APP_SCHEME: 'BAD SCHEME' },
        { isRelease: false },
      );
      throw new Error('expected parseConfig to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('assertAuth0Configured', () => {
  it('returns the config when Auth0 values are present', () => {
    const config = parseConfig(LIVE_ENV, { isRelease: false });

    expect(assertAuth0Configured(config).domain).toBe('daywell.eu.auth0.com');
  });

  it('throws when sign-in would be attempted without a tenant', () => {
    const config = parseConfig({}, { isRelease: false });

    expect(() => assertAuth0Configured(config)).toThrow(/EXPO_PUBLIC_AUTH0_DOMAIN/);
  });
});

describe('runtime constants', () => {
  it('keeps the request timeout inside the PRD 7.2 range', () => {
    expect(API_TIMEOUT_MS).toBe(15_000);
  });

  it('polls the badge within the PRD 6.1 window', () => {
    expect(CART_BADGE_POLL_INTERVAL_MS).toBe(15_000);
  });
});
