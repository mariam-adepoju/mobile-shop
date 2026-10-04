/**
 * Single-flight access-token refresh (AGENTS.md 6.4).
 *
 * When several requests fail with 401 at once - which is exactly what happens
 * on a cold start with a stale token - they must share **one** refresh, not
 * one each. Otherwise the Auth0 refresh-token rotation used by the Auth0 SDK
 * would burn a token per request and invalidate the session.
 */

/** Must return a fresh access token, or `null` if the session is gone. */
export type RefreshAccessToken = () => Promise<string | null>;

/** Returns the current access token from the Auth0 credentials manager. */
export type GetAccessToken = () => Promise<string | null>;

export interface TokenManagerOptions {
  readonly getAccessToken: GetAccessToken;
  readonly refreshAccessToken: RefreshAccessToken;
}

export class TokenManager {
  readonly #getAccessToken: GetAccessToken;
  readonly #refreshAccessToken: RefreshAccessToken;
  /** The single in-flight refresh, shared by every concurrent caller. */
  #inFlight: Promise<string | null> | null = null;

  constructor(options: TokenManagerOptions) {
    this.#getAccessToken = options.getAccessToken;
    this.#refreshAccessToken = options.refreshAccessToken;
  }

  /** Read the current token. Never refreshes. */
  getAccessToken(): Promise<string | null> {
    return this.#getAccessToken();
  }

  /**
   * Force a refresh and return the new token, or `null` if unrecoverable.
   *
   * Callers invoke this only after a 401, so it must NOT re-read and reuse
   * the cached token - that token is exactly what the server just rejected.
   * Concurrent callers share a single in-flight refresh.
   */
  async refreshAccessToken(): Promise<string | null> {
    this.#inFlight ??= this.#runRefresh();
    try {
      return await this.#inFlight;
    } finally {
      // Clear only the promise we awaited, so a later refresh can start.
      this.#inFlight = null;
    }
  }

  async #runRefresh(): Promise<string | null> {
    try {
      const token = await this.#refreshAccessToken();
      return token !== null && token.length > 0 ? token : null;
    } catch {
      // A failed refresh is indistinguishable from no session; the request
      // that triggered it will surface a 401 and route to sign-in.
      return null;
    }
  }

  /** Test seam: is a refresh currently in progress? */
  get isRefreshing(): boolean {
    return this.#inFlight !== null;
  }
}
