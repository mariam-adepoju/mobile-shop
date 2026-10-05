/**
 * Typed errors for the single API client (AGENTS.md 6).
 *
 * Every failure mode the backend can produce gets its own class so a screen
 * can render a distinct state. AGENTS.md 6 forbids collapsing these.
 */

/**
 * Machine-readable codes the backend may return (backend doc 5.4 / PRD 4.3-5).
 *
 * The wire value is a plain string, so an unknown code from a newer backend is
 * preserved verbatim on {@link ApiError.code} and falls back to a generic
 * recoverable message rather than crashing.
 */
export const KNOWN_ERROR_CODES = [
  // Catalog / cart
  'OUT_OF_STOCK',
  'MAX_QUANTITY_EXCEEDED',
  'PRESCRIPTION_ONLY',
  'PRODUCT_UNAVAILABLE',
  'PRODUCT_INACTIVE',
  'EMPTY_CART',
  // Identity / address
  'UNAUTHENTICATED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'ADDRESS_NOT_FOUND',
  'INVALID_ADDRESS',
  'VALIDATION_ERROR',
  // Orders / payment
  'ORDER_NOT_FOUND',
  'ORDER_NOT_PAYABLE',
  'ORDER_EXPIRED',
  'PAYMENT_IN_PROGRESS',
  'PAYMENT_EXPIRED',
  'PAYMENT_FAILED',
  'PAYMENT_VERIFICATION_FAILED',
  'INVALID_REFERENCE',
  // Generic
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

const KNOWN = new Set<string>(KNOWN_ERROR_CODES);

/** Narrow an arbitrary wire string to a documented code. */
export function isKnownErrorCode(code: string): code is KnownErrorCode {
  return KNOWN.has(code);
}

/** Per-field validation messages, keyed by field name (PRD 7.1). */
export type FieldErrors = Readonly<Record<string, string>>;

/** Shared base so a screen can catch the whole family with one handler. */
export class ApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * The backend returned a structured error envelope, or a non-2xx status.
 *
 * `code` may be an undocumented string; `message` is already user-safe text
 * supplied by the backend.
 */
export class ApiError extends ApiClientError {
  readonly status: number;
  readonly code: string;
  /** Field name -> message, for form binding. */
  readonly fieldErrors: FieldErrors;
  /** Seconds from a `Retry-After` header on 429. */
  readonly retryAfterSeconds: number | undefined;
  /** `x-correlation-id`, safe to log and useful for support (PRD 12). */
  readonly correlationId: string | undefined;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    fieldErrors?: FieldErrors;
    retryAfterSeconds?: number;
    correlationId?: string;
  }) {
    super(init.message);
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? {};
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.correlationId = init.correlationId;
  }

  /** True when the user is rate limited and we know when to try again. */
  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

/**
 * The response did not match the endpoint's Zod schema.
 *
 * The payload is deliberately NOT retained or logged (AGENTS.md 3.9): a
 * contract breach may contain PII. The user sees a generic recoverable error.
 */
export class ContractError extends ApiClientError {
  readonly endpoint: string;
  /** Issue paths only, never values. */
  readonly issues: readonly string[];

  constructor(endpoint: string, issues: readonly string[]) {
    super('The server sent data this app does not understand. Please try again.');
    this.endpoint = endpoint;
    this.issues = issues;
  }
}

/** The request exceeded `API_TIMEOUT_MS` and was aborted. */
export class TimeoutError extends ApiClientError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super('The request timed out. Please check your connection and try again.');
    this.timeoutMs = timeoutMs;
  }
}

/** DNS failure, airplane mode, TLS error, or the host is unreachable. */
export class NetworkError extends ApiClientError {
  constructor(message = 'You appear to be offline. Please check your connection.') {
    super(message);
  }
}

/** The request was aborted deliberately, e.g. a screen unmounted. */
export class CancelledError extends ApiClientError {
  constructor() {
    super('Request cancelled.');
  }
}

/** No usable credentials. Raised before any request is sent. */
export class MissingTokenError extends ApiClientError {
  constructor() {
    super('You need to sign in to do that.');
  }
}
