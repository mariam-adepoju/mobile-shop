/**
 * Public surface of the single API client (AGENTS.md 6).
 *
 * Screens and components must import from here and must never call `fetch`.
 */
export {
  ApiClient,
  type ApiClientOptions,
  type ApiResponse,
  type FetchLike,
  type HttpMethod,
  type RawResponse,
  type RequestOptions,
  type ResponseSchema,
} from './client';

export {
  ApiClientError,
  ApiError,
  CancelledError,
  ContractError,
  KNOWN_ERROR_CODES,
  MissingTokenError,
  NetworkError,
  TimeoutError,
  isKnownErrorCode,
  type FieldErrors,
  type KnownErrorCode,
} from './errors';

export {
  GENERIC_ERROR_MESSAGE,
  isTerminalErrorCode,
  isTransientErrorCode,
  messageForErrorCode,
} from './error-messages';

export { ErrorEnvelopeSchema, SuccessEnvelopeSchema, parseRetryAfter } from './envelope';

export { TokenManager, type GetAccessToken, type RefreshAccessToken } from './token-manager';
