import { API_RETRY, API_TIMEOUT_MS, type RetryPolicy } from '@/lib/config';
import { logger } from '@/lib/logger';

import {
  ApiError,
  CancelledError,
  ContractError,
  MissingTokenError,
  NetworkError,
  TimeoutError,
} from './errors';
import { apiErrorFromResponse, SuccessEnvelopeSchema } from './envelope';
import type { TokenManager } from './token-manager';

/** Minimal `fetch` shape, so tests can inject a stub. */
export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  status: number;
  ok: boolean;
  headers: Headers | Record<string, string>;
  text: () => Promise<string>;
}>;

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Zod-compatible subset the client needs from an endpoint schema. */
export interface ResponseSchema<T> {
  safeParse: (
    value: unknown,
  ) =>
    { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[] }[] } };
}

export interface RequestOptions<T> {
  /** Path relative to the API base, e.g. `/catalog/departments`. */
  readonly path: string;
  readonly method?: HttpMethod;
  /** Send `Authorization: Bearer <access token>`. */
  readonly auth?: boolean;
  /** `data` is validated with this schema after the envelope is unwrapped. */
  readonly schema: ResponseSchema<T>;
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
  /**
   * Reuse a stable UUID across retries of one checkout attempt (AGENTS.md 6.6).
   * Without one, a mutation is never auto-retried.
   */
  readonly idempotencyKey?: string;
  /** Caller-owned cancellation, e.g. a screen unmounting. */
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /** Use the real backend even when other features run against fixtures. */
  readonly liveOnly?: boolean;
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly fetchImpl: FetchLike;
  readonly liveFetchImpl?: FetchLike;
  readonly tokens?: TokenManager;
  /** Invoked once when a request still fails with 401 after a refresh. */
  readonly onSessionExpired?: () => void;
  /** Injectable for tests; defaults to a real setTimeout. */
  readonly sleep?: (ms: number) => Promise<void>;
  readonly timeoutMs?: number;
  readonly retry?: RetryPolicy;
}

export interface RawResponse {
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Headers | Record<string, string>;
  readonly body: unknown;
}

/** The payload plus response metadata for a successful call. */
export interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(query: RequestOptions<unknown>['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.append(key, String(value));
  }
  const serialised = params.toString();
  return serialised.length > 0 ? `?${serialised}` : '';
}

/** Cap the issue list so a wholly wrong payload cannot produce a giant log. */
function summariseIssues(error: { issues: { path: PropertyKey[] }[] }): string[] {
  return error.issues.slice(0, 5).map((issue) => issue.path.join('.') || '(root)');
}

function safeJsonParse(text: string): unknown {
  if (text.trim().length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // A non-JSON body (HTML error page, empty 204) is handled by the caller.
    return null;
  }
}

export class ApiClient {
  readonly #baseUrl: string;
  readonly #fetch: FetchLike;
  readonly #liveFetch: FetchLike;
  readonly #tokens: TokenManager | undefined;
  readonly #onSessionExpired: (() => void) | undefined;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #timeoutMs: number;
  readonly #retry: RetryPolicy;

  constructor(options: ApiClientOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.#fetch = options.fetchImpl;
    this.#liveFetch = options.liveFetchImpl ?? options.fetchImpl;
    this.#tokens = options.tokens;
    this.#onSessionExpired = options.onSessionExpired;
    this.#sleep = options.sleep ?? defaultSleep;
    this.#timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
    this.#retry = options.retry ?? API_RETRY;
  }

  /**
   * Perform a request and return its validated payload.
   *
   * @throws {ApiError} for a structured backend error.
   * @throws {ContractError} when `data` fails the endpoint schema.
   * @throws {TimeoutError} when the call exceeds the configured timeout.
   * @throws {NetworkError} for transport failures.
   * @throws {CancelledError} when the caller's signal aborts.
   * @throws {MissingTokenError} when an authenticated route has no token.
   */
  async request<T>(options: RequestOptions<T>): Promise<ApiResponse<T>> {
    const method = options.method ?? 'GET';
    const isMutation = method !== 'GET';

    // A mutation without an idempotency key is unsafe to repeat, so it gets
    // exactly one attempt. Reads get bounded retries with backoff.
    const maxAttempts =
      isMutation && options.idempotencyKey === undefined ? 1 : this.#retry.maxAttempts;

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.#attempt(options, method);
      } catch (error) {
        lastError = error;
        if (!this.#shouldRetry(error, attempt, maxAttempts)) throw error;

        // Exponential backoff, clamped (AGENTS.md 6.5).
        const delay = Math.min(
          this.#retry.baseDelayMs * 2 ** (attempt - 1),
          this.#retry.maxDelayMs,
        );
        logger.warn('api.retry', { attempt, delay, path: options.path, method });
        await this.#sleep(delay);
      }
    }

    throw lastError;
  }

  #shouldRetry(error: unknown, attempt: number, maxAttempts: number): boolean {
    if (attempt >= maxAttempts) return false;
    // A contract breach will not fix itself; retrying only risks a duplicate.
    if (error instanceof CancelledError) return false;
    if (error instanceof ContractError) return false;
    if (error instanceof ApiError) {
      // 401 is handled inside #attempt (refresh + one retry), never here.
      return error.status >= 500 || error.status === 429;
    }
    // Timeouts and transport failures are safe to repeat for a read.
    return error instanceof TimeoutError || error instanceof NetworkError;
  }

  async #attempt<T>(options: RequestOptions<T>, method: HttpMethod): Promise<ApiResponse<T>> {
    const auth = options.auth ?? false;
    let token: string | null = null;

    if (auth) {
      if (!this.#tokens) throw new MissingTokenError();
      token = await this.#tokens.getAccessToken();
      if (token === null || token.length === 0) throw new MissingTokenError();
    }

    const response = await this.#send(options, method, token);

    if (response.status === 401 && auth) {
      // Single-flight refresh, then retry this request exactly once.
      const refreshed = this.#tokens ? await this.#tokens.refreshAccessToken() : null;

      if (refreshed !== null && refreshed.length > 0) {
        const retry = await this.#send(options, method, refreshed);
        // A fresh token that is still rejected means the session itself is
        // unusable, so the app must route to sign-in (AGENTS.md 6.4).
        if (retry.status !== 401) return this.#finish(options, retry);
        this.#expireSession(options.path);
        return this.#finish(options, retry);
      }

      // No recoverable session: tell the app, then surface the 401 below.
      this.#expireSession(options.path);
    }

    return this.#finish(options, response);
  }

  #expireSession(path: string): void {
    logger.info('api.session-expired', { path });
    this.#onSessionExpired?.();
  }

  async #send<T>(
    options: RequestOptions<T>,
    method: HttpMethod,
    token: string | null,
  ): Promise<RawResponse> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    // AGENTS.md 3.4: the ACCESS token goes to the API, never the ID token.
    if (token !== null) headers.Authorization = `Bearer ${token}`;
    // AGENTS.md 6.6: stable key across retries of one checkout attempt.
    if (options.idempotencyKey !== undefined) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const url = `${this.#baseUrl}${options.path}${buildQuery(options.query)}`;
    const timeoutMs = options.timeoutMs ?? this.#timeoutMs;

    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onExternalAbort);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const raw = await (options.liveOnly ? this.#liveFetch : this.#fetch)(url, {
        method,
        headers,
        signal: controller.signal,
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      });
      const text = await raw.text();
      return { status: raw.status, ok: raw.ok, headers: raw.headers, body: safeJsonParse(text) };
    } catch {
      if (options.signal?.aborted) throw new CancelledError();
      if (timedOut) throw new TimeoutError(timeoutMs);
      // Anything else here is a transport failure: DNS, TLS, offline.
      logger.warn('api.transport-error', { path: options.path, method });
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  async #finish<T>(options: RequestOptions<T>, response: RawResponse): Promise<ApiResponse<T>> {
    if (!response.ok) {
      throw apiErrorFromResponse(response, response.body);
    }

    const envelope = SuccessEnvelopeSchema.safeParse(response.body);
    if (!envelope.success) {
      const issues = summariseIssues(envelope.error);
      this.#reportMismatch(options, issues);
      throw new ContractError(options.path, issues);
    }

    const parsed = options.schema.safeParse(envelope.data.data);
    if (!parsed.success) {
      const issues = summariseIssues(parsed.error);
      this.#reportMismatch(options, issues);
      throw new ContractError(options.path, issues);
    }

    return { data: parsed.data, status: response.status };
  }

  /** Log a breach without the payload: it may contain PII (AGENTS.md 3.9). */
  #reportMismatch<T>(options: RequestOptions<T>, issues: string[]): void {
    logger.error('api.contract-mismatch', {
      endpoint: `${options.method ?? 'GET'} ${options.path}`,
      issues,
    });
  }

  /* Convenience verbs. Features use these; screens never call fetch. */

  get<T>(
    path: string,
    schema: ResponseSchema<T>,
    options: Omit<RequestOptions<T>, 'path' | 'method' | 'schema'> = {},
  ) {
    return this.request<T>({ ...options, path, method: 'GET', schema });
  }

  post<T>(
    path: string,
    schema: ResponseSchema<T>,
    options: Omit<RequestOptions<T>, 'path' | 'method' | 'schema'> = {},
  ) {
    return this.request<T>({ ...options, path, method: 'POST', schema });
  }

  patch<T>(path: string, schema: ResponseSchema<T>, options: Omit<RequestOptions<T>, 'path' | 'method' | 'schema'> = {}) {
    return this.request<T>({ ...options, path, method: 'PATCH', schema });
  }

  delete<T>(path: string, schema: ResponseSchema<T>, options: Omit<RequestOptions<T>, 'path' | 'method' | 'schema'> = {}) {
    return this.request<T>({ ...options, path, method: 'DELETE', schema });
  }
}
