import { isKnownErrorCode, KNOWN_ERROR_CODES, type KnownErrorCode } from './errors';

/**
 * Human message for a documented `error.code` (AGENTS.md 6).
 *
 * The backend owns the authoritative message; this map is the app's fallback
 * for codes it does not carry text for, and the single place to decide which
 * codes deserve a *distinct* UI state rather than a generic toast.
 */
const MESSAGES: Readonly<Record<KnownErrorCode, string>> = {
  OUT_OF_STOCK: 'This item just sold out. Please remove it to continue.',
  MAX_QUANTITY_EXCEEDED: 'You have reached the maximum quantity allowed for this item.',
  PRESCRIPTION_ONLY: 'This item is prescription-only and cannot be bought online.',
  PRODUCT_UNAVAILABLE: 'This product is not available right now.',
  PRODUCT_INACTIVE: 'This product is not available right now.',
  EMPTY_CART: 'Your cart is empty.',

  UNAUTHENTICATED: 'Your session has expired. Please sign in again.',
  UNAUTHORIZED: 'Your session could not be verified. Please sign in again.',
  FORBIDDEN: 'You do not have access to this.',
  ADDRESS_NOT_FOUND: 'That delivery address no longer exists.',
  INVALID_ADDRESS: 'Please check the delivery address.',
  VALIDATION_ERROR: 'Please check the highlighted fields.',

  ORDER_NOT_FOUND: 'We could not find that order.',
  ORDER_NOT_PAYABLE: 'This order can no longer be paid.',
  ORDER_EXPIRED: 'This order has expired. Please start a new one.',
  PAYMENT_IN_PROGRESS: 'A payment for this order is already in progress.',
  PAYMENT_EXPIRED: 'That payment window expired. Please try paying again.',
  PAYMENT_FAILED: 'The payment was not completed. Please try again.',
  PAYMENT_VERIFICATION_FAILED:
    'We could not confirm your payment yet. Your order is still being checked.',
  INVALID_REFERENCE: 'That payment link is not valid.',

  NOT_FOUND: 'We could not find what you were looking for.',
  CONFLICT: 'Something changed. Please refresh and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
};

/** Shown for any code the app does not recognise (AGENTS.md 6). */
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Map a backend error code to user-safe text.
 *
 * An unrecognised code degrades to {@link GENERIC_ERROR_MESSAGE} rather than
 * surfacing raw server text, which could leak internals (DESIGN.md 6).
 */
export function messageForErrorCode(code: string, fallback?: string): string {
  if (isKnownErrorCode(code)) {
    return MESSAGES[code];
  }
  return fallback?.trim() || GENERIC_ERROR_MESSAGE;
}

/**
 * Codes that must render a dedicated, non-transient UI state.
 *
 * A screen uses this to decide between "show an error banner with Retry" and
 * "show a blocking explanation with an action".
 */
const TERMINAL_CODES: ReadonlySet<string> = new Set<KnownErrorCode>([
  'PRESCRIPTION_ONLY',
  'PRODUCT_UNAVAILABLE',
  'PRODUCT_INACTIVE',
  'ADDRESS_NOT_FOUND',
  'INVALID_ADDRESS',
  'ORDER_NOT_FOUND',
  'ORDER_NOT_PAYABLE',
  'ORDER_EXPIRED',
  'INVALID_REFERENCE',
]);

/** True when retrying the same request unchanged cannot succeed. */
export function isTerminalErrorCode(code: string): boolean {
  return TERMINAL_CODES.has(code);
}

/**
 * Codes where a short, bounded retry is worthwhile (transient upstream state).
 */
const TRANSIENT_CODES: ReadonlySet<string> = new Set<KnownErrorCode>([
  'RATE_LIMITED',
  'PAYMENT_IN_PROGRESS',
  'INTERNAL_ERROR',
]);

/** True when the error is worth retrying on the user's behalf. */
export function isTransientErrorCode(code: string): boolean {
  return TRANSIENT_CODES.has(code);
}

/** Exposed for tests and for the contract script. */
export const ERROR_CODE_COUNT = KNOWN_ERROR_CODES.length;
