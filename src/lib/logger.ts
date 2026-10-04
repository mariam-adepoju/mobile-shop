/**
 * Redacting structured logger (AGENTS.md 3.9, PRD 12).
 *
 * Nothing in this app may print a token, a phone number, a full address or a
 * raw response body. Every value passed here is scrubbed first, so a careless
 * call site degrades into something safe rather than leaking.
 *
 * `console.log` is banned by ESLint everywhere in `src/` (AGENTS.md 11). This
 * module is the single sanctioned exception, and only for the four methods it
 * owns.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Readonly<Record<string, unknown>>;

const REDACTED = '[redacted]';

/**
 * Keys whose values are never safe to print, whatever they contain.
 * Matched case-insensitively after removing separators, so `access_token`,
 * `accessToken` and `access-token` are all caught.
 */
const SENSITIVE_KEYS = new Set([
  'authorization',
  'bearer',
  'accesstoken',
  'idtoken',
  'refreshtoken',
  'token',
  'password',
  'secret',
  'clientsecret',
  'apikey',
  'paystacksecretkey',
  'privatekey',
  'cookie',
  'setcookie',
  'otp',
  'pin',
  'cvv',
  'cardnumber',
]);

/** Values that look like credentials or Nigerian phone numbers, wherever they appear. */
const PATTERNS: readonly { readonly re: RegExp; readonly replace: string }[] = [
  // `Bearer eyJhbGci...` / `Basic ...`
  { re: /\b(bearer|basic)\s+[\w.\-~+/=]+/gi, replace: `$1 ${REDACTED}` },
  // A bare JWT: header.payload.signature. Each segment is base64url; the
  // segments are kept deliberately permissive so short test fixtures and
  // truncated tokens are still caught.
  { re: /\beyJ[\w-]*\.[\w-]+\.[\w-]+/g, replace: REDACTED },
  // Nigerian numbers, incl. spaced and +234 forms.
  { re: /(?<!\d)(?:\+?234[\s-]?|0)[\d\s-]{8,14}(?!\d)/g, replace: REDACTED },
  // Email addresses.
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/g, replace: REDACTED },
  // Paystack-style references are safe to keep, but URLs may carry secrets.
  { re: /([?&](?:token|secret|key|signature|sig|password)=)[^&\s]+/gi, replace: `$1${REDACTED}` },
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.replace(/[_\-\s]/g, '').toLowerCase());
}

/** Scrub secrets out of an arbitrary string. */
export function redactString(value: string): string {
  let output = value;
  for (const { re, replace } of PATTERNS) {
    output = output.replace(re, replace);
  }
  return output;
}

/**
 * Recursively redact a log context.
 *
 * Sensitive keys are replaced wholesale; every remaining string has the
 * credential/phone/email patterns stripped. Depth and breadth are bounded so
 * a cyclic or enormous object cannot hang the JS thread.
 */
export function redactContext(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]';
  if (value === null || value === undefined) return value;

  switch (typeof value) {
    case 'string':
      return redactString(value);
    case 'number':
    case 'boolean':
    case 'bigint':
      return value;
    case 'function':
      return '[function]';
    case 'symbol':
      return '[symbol]';
    default:
      break;
  }

  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactContext(item, depth + 1));
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(source).slice(0, 50)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redactContext(source[key], depth + 1);
  }
  return output;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const safeMessage = redactString(message);
  const safeContext = context === undefined ? undefined : (redactContext(context) as LogContext);

  // Development only: production logs could still reach a crash reporter, and
  // PRD 12 forbids credential and PII leakage through any channel.
  if (!__DEV__) return;

  const line =
    safeContext === undefined ? safeMessage : `${safeMessage} ${JSON.stringify(safeContext)}`;
  // The four calls below are the sanctioned console usage in src/.
  /* eslint-disable no-console */
  switch (level) {
    case 'debug':
      console.debug(line);
      break;
    case 'info':
      console.info(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
  }
  /* eslint-enable no-console */
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
} as const;
