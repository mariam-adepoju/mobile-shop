import { z } from 'zod';

import { ApiError, type FieldErrors } from './errors';

/**
 * Success envelope: `{ "data": ... }` (PRD 7.1).
 *
 * `data` is intentionally `unknown` here; each endpoint validates it with its
 * own Zod schema (AGENTS.md 5, "Validation").
 */
export const SuccessEnvelopeSchema = z.object({
  data: z.unknown(),
});

/** Error envelope: `{ "error": { code, message, fieldErrors? } }` (PRD 7.1). */
export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().optional(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  }),
});

export type SuccessEnvelope = z.infer<typeof SuccessEnvelopeSchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/** Parse `Retry-After`, which is either delta-seconds or an HTTP date. */
export function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) return undefined;

  const seconds = Number(header.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;

  const asDate = Date.parse(header);
  if (Number.isNaN(asDate)) return undefined;

  const deltaSeconds = Math.round((asDate - Date.now()) / 1000);
  return deltaSeconds > 0 ? deltaSeconds : 0;
}

/** Read a header case-insensitively from a plain record. */
export function headerValue(
  headers: Headers | Record<string, string>,
  name: string,
): string | null {
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name);
  }
  const record = headers as Record<string, string>;
  const match = Object.keys(record).find((key) => key.toLowerCase() === name.toLowerCase());
  return match === undefined ? null : record[match];
}

/**
 * Turn a non-2xx response into an {@link ApiError}.
 *
 * Prefers the structured error envelope; falls back to a status-derived code so
 * an HTML error page or an empty body still produces something typed rather
 * than an unhandled crash.
 */
export function apiErrorFromResponse(
  response: { status: number; headers: Headers | Record<string, string> },
  body: unknown,
): ApiError {
  const parsed = ErrorEnvelopeSchema.safeParse(body);
  const retryAfterSeconds = parseRetryAfter(headerValue(response.headers, 'retry-after'));
  const correlationId = headerValue(response.headers, 'x-correlation-id') ?? undefined;

  if (parsed.success) {
    const { code, message, fieldErrors } = parsed.data.error;
    return new ApiError({
      status: response.status,
      code,
      // The message is only a fallback; `messageForErrorCode` owns user text.
      message: message ?? '',
      fieldErrors: fieldErrors as FieldErrors | undefined,
      retryAfterSeconds,
      correlationId,
    });
  }

  const FALLBACK: Readonly<Record<number, string>> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
  };

  return new ApiError({
    status: response.status,
    code: FALLBACK[response.status] ?? 'INTERNAL_ERROR',
    message: '',
    retryAfterSeconds,
    correlationId,
  });
}
