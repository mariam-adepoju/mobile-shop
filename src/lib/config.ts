/**
 * Environment validation and runtime constants.
 *
 * Every `EXPO_PUBLIC_*` value is validated once, here, before any other module
 * reads it (AGENTS.md 5). Only non-secret values may use the `EXPO_PUBLIC_`
 * prefix (AGENTS.md 3.1) — a secret here would ship inside the app bundle.
 */
import { z } from 'zod';

/** Raised when the environment does not satisfy the PRD 16 contract. */
export class ConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration:\n- ${issues.join('\n- ')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

/** PRD 16 names. Kept in one place so `.env.example` and tests cannot drift. */
export const ENV_KEYS = [
  'EXPO_PUBLIC_API_MODE',
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_AUTH0_DOMAIN',
  'EXPO_PUBLIC_AUTH0_CLIENT_ID',
  'EXPO_PUBLIC_AUTH0_AUDIENCE',
  'EXPO_PUBLIC_APP_SCHEME',
] as const;

export type EnvKey = (typeof ENV_KEYS)[number];
export type RawEnv = Partial<Record<EnvKey, string | undefined>>;

export type ApiMode = 'mock' | 'live';

/** RFC 3986 scheme: used for the app's custom deep-link scheme (PRD 7.4). */
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*$/;

/** Trailing slashes are stripped so `${baseUrl}/cart` never doubles up. */
function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

const EnvSchema = z.object({
  EXPO_PUBLIC_API_MODE: z.enum(['mock', 'live']).default('mock'),
  EXPO_PUBLIC_API_BASE_URL: z.string().default(''),
  EXPO_PUBLIC_AUTH0_DOMAIN: z.string().default(''),
  EXPO_PUBLIC_AUTH0_CLIENT_ID: z.string().default(''),
  EXPO_PUBLIC_AUTH0_AUDIENCE: z.string().default(''),
  EXPO_PUBLIC_APP_SCHEME: z.string().default('daywell'),
});

export interface Auth0Config {
  readonly domain: string;
  readonly clientId: string;
  readonly audience: string;
  /** True once all three values are present; M4's sign-in screen requires it. */
  readonly configured: boolean;
}

export interface AppConfig {
  readonly mode: ApiMode;
  readonly apiBaseUrl: string;
  readonly auth0: Auth0Config;
  readonly appScheme: string;
}

export interface ParseOptions {
  /**
   * Whether this is a shipped build. Defaults to `!__DEV__`.
   * Release builds must reject non-HTTPS API base URLs (AGENTS.md 11).
   */
  readonly isRelease?: boolean;
}

/**
 * Validate a raw environment into an {@link AppConfig}.
 *
 * Pure and total: it never reads `process.env` itself, so tests can exercise
 * every branch by passing an explicit object.
 *
 * @throws {ConfigError} when the environment is unusable.
 */
export function parseConfig(env: RawEnv, options: ParseOptions = {}): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((issue) => issue.message));
  }

  const raw = parsed.data;
  const isRelease = options.isRelease ?? !__DEV__;
  const issues: string[] = [];

  const appScheme = raw.EXPO_PUBLIC_APP_SCHEME;
  if (!SCHEME_PATTERN.test(appScheme)) {
    issues.push(
      `EXPO_PUBLIC_APP_SCHEME must be a valid URI scheme (lowercase, no spaces): got "${appScheme}".`,
    );
  }

  const apiBaseUrl = normalizeBaseUrl(raw.EXPO_PUBLIC_API_BASE_URL.trim());

  if (raw.EXPO_PUBLIC_API_MODE === 'live') {
    if (apiBaseUrl.length === 0) {
      issues.push('EXPO_PUBLIC_API_BASE_URL is required when EXPO_PUBLIC_API_MODE=live.');
    } else if (!URL.canParse(apiBaseUrl)) {
      issues.push(`EXPO_PUBLIC_API_BASE_URL is not a valid URL: got "${apiBaseUrl}".`);
    }
  } else if (apiBaseUrl.length > 0 && !URL.canParse(apiBaseUrl)) {
    // Mock mode ignores the URL, but a typo should still surface early.
    issues.push(`EXPO_PUBLIC_API_BASE_URL is not a valid URL: got "${apiBaseUrl}".`);
  }

  // AGENTS.md 11: "Release builds reject non-HTTPS base URLs."
  if (isRelease && apiBaseUrl.startsWith('http://')) {
    issues.push('Release builds require an https:// EXPO_PUBLIC_API_BASE_URL.');
  }

  const domain = raw.EXPO_PUBLIC_AUTH0_DOMAIN.trim();
  const clientId = raw.EXPO_PUBLIC_AUTH0_CLIENT_ID.trim();
  const audience = raw.EXPO_PUBLIC_AUTH0_AUDIENCE.trim();

  if (domain.length > 0 && /[\s/:]/.test(domain)) {
    issues.push('EXPO_PUBLIC_AUTH0_DOMAIN must be a bare host, e.g. "tenant.eu.auth0.com".');
  }
  if (clientId.length > 0 && /\s/.test(clientId)) {
    issues.push('EXPO_PUBLIC_AUTH0_CLIENT_ID must not contain whitespace.');
  }
  // Auth0 API identifiers are URIs, e.g. "https://api.daywell.com".
  if (audience.length > 0 && !URL.canParse(audience)) {
    issues.push('EXPO_PUBLIC_AUTH0_AUDIENCE must be a URI, e.g. "https://api.daywell.com".');
  }

  if (issues.length > 0) {
    throw new ConfigError(issues);
  }

  return {
    mode: raw.EXPO_PUBLIC_API_MODE,
    apiBaseUrl,
    auth0: {
      domain,
      clientId,
      audience,
      configured: domain.length > 0 && clientId.length > 0 && audience.length > 0,
    },
    appScheme,
  };
}

/**
 * Values inlined into the bundle by the Expo CLI.
 *
 * Each name is read as a literal `process.env.EXPO_PUBLIC_*` member expression
 * on purpose: the bundler replaces those statically, and cannot replace a
 * computed lookup such as `process.env[name]`.
 */
const INLINED_ENV: RawEnv = {
  EXPO_PUBLIC_API_MODE: process.env.EXPO_PUBLIC_API_MODE,
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
  EXPO_PUBLIC_AUTH0_AUDIENCE: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
  EXPO_PUBLIC_APP_SCHEME: process.env.EXPO_PUBLIC_APP_SCHEME,
};

let cached: AppConfig | undefined;

/** The validated configuration. Parsed lazily so test imports never throw. */
export function getConfig(): AppConfig {
  cached ??= parseConfig(INLINED_ENV);
  return cached;
}

/** Reset the memoised config. Test-only. */
export function resetConfigForTests(): void {
  cached = undefined;
}

/**
 * Guard for the sign-in flow (M4).
 *
 * Auth0 values are deliberately optional at M2 so the app boots and the catalog
 * can be developed before the tenant exists (PRD 4.1). Sign-in must not.
 */
export function assertAuth0Configured(config: AppConfig = getConfig()): Auth0Config {
  if (!config.auth0.configured) {
    throw new ConfigError([
      'Sign-in requires EXPO_PUBLIC_AUTH0_DOMAIN, EXPO_PUBLIC_AUTH0_CLIENT_ID and EXPO_PUBLIC_AUTH0_AUDIENCE.',
    ]);
  }
  return config.auth0;
}

/* ------------------------------------------------------------------ *
 * Runtime constants (PRD 13: "All timeouts, retries, and backoff
 * constants live in one config module").
 * ------------------------------------------------------------------ */

/** Per-request ceiling before the call is aborted. */
export const API_TIMEOUT_MS = 15_000;

/** Bounded backoff for idempotent GET retries only. */
export const API_RETRY = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 2_000,
} as const;

/** PRD 6.1: poll `GET /cart` every 3-5s while focused and active. */
export const CART_POLL_INTERVAL_MS = 4_000;

/** PRD 6.1: refresh the tab badge roughly every 15s while the app is active. */
export const CART_BADGE_POLL_INTERVAL_MS = 15_000;