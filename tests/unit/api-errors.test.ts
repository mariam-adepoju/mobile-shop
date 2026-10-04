import {
  GENERIC_ERROR_MESSAGE,
  KNOWN_ERROR_CODES,
  TokenManager,
  isKnownErrorCode,
  isTerminalErrorCode,
  isTransientErrorCode,
  messageForErrorCode,
} from '@/lib/api';
import { parseRetryAfter } from '@/lib/api/envelope';

describe('messageForErrorCode', () => {
  it('maps every documented code to non-empty, distinct-enough text', () => {
    for (const code of KNOWN_ERROR_CODES) {
      expect(messageForErrorCode(code).length).toBeGreaterThan(0);
    }
  });

  it('gives OUT_OF_STOCK its own message rather than a generic one', () => {
    expect(messageForErrorCode('OUT_OF_STOCK')).not.toBe(GENERIC_ERROR_MESSAGE);
    expect(messageForErrorCode('OUT_OF_STOCK')).toMatch(/sold out/i);
  });

  it('does not collapse the payment states into one message (PRD 9.1)', () => {
    const codes = [
      'PAYMENT_IN_PROGRESS',
      'PAYMENT_EXPIRED',
      'PAYMENT_FAILED',
      'PAYMENT_VERIFICATION_FAILED',
    ] as const;
    const messages = codes.map((code) => messageForErrorCode(code));

    expect(new Set(messages).size).toBe(codes.length);
  });

  it('falls back to a generic message for an unknown code', () => {
    expect(messageForErrorCode('SOMETHING_NEW')).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('prefers the backend message when one is supplied', () => {
    expect(messageForErrorCode('SOMETHING_NEW', 'Backend says no')).toBe('Backend says no');
  });

  it('ignores an empty backend message', () => {
    expect(messageForErrorCode('SOMETHING_NEW', '   ')).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe('error code classification', () => {
  it('recognises documented codes and rejects others', () => {
    expect(isKnownErrorCode('OUT_OF_STOCK')).toBe(true);
    expect(isKnownErrorCode('NOT_A_CODE')).toBe(false);
  });

  it('marks codes a retry cannot fix as terminal', () => {
    expect(isTerminalErrorCode('PRESCRIPTION_ONLY')).toBe(true);
    expect(isTerminalErrorCode('ORDER_EXPIRED')).toBe(true);
    expect(isTerminalErrorCode('OUT_OF_STOCK')).toBe(false);
  });

  it('marks transient codes as worth retrying', () => {
    expect(isTransientErrorCode('RATE_LIMITED')).toBe(true);
    expect(isTransientErrorCode('OUT_OF_STOCK')).toBe(false);
  });
});

describe('parseRetryAfter', () => {
  it('reads delta-seconds', () => {
    expect(parseRetryAfter('30')).toBe(30);
  });

  it('reads an HTTP date in the future', () => {
    const future = new Date(Date.now() + 60_000).toUTCString();
    expect(parseRetryAfter(future)).toBeGreaterThan(0);
  });

  it('clamps a past date to zero', () => {
    const past = new Date(Date.now() - 60_000).toUTCString();
    expect(parseRetryAfter(past)).toBe(0);
  });

  it('returns undefined for a missing or unparsable header', () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter('soon')).toBeUndefined();
  });
});

describe('TokenManager', () => {
  it('reads the current token without refreshing', async () => {
    let refreshes = 0;
    const tokens = new TokenManager({
      getAccessToken: async () => 'current',
      refreshAccessToken: async () => {
        refreshes += 1;
        return 'fresh';
      },
    });

    await expect(tokens.getAccessToken()).resolves.toBe('current');
    expect(refreshes).toBe(0);
  });

  it('forces a refresh even though a token is cached', async () => {
    let refreshes = 0;
    const tokens = new TokenManager({
      getAccessToken: async () => 'stale',
      refreshAccessToken: async () => {
        refreshes += 1;
        return 'fresh';
      },
    });

    // The cached token is the one the server just rejected, so it must not be
    // handed back.
    await expect(tokens.refreshAccessToken()).resolves.toBe('fresh');
    expect(refreshes).toBe(1);
  });

  it('collapses concurrent refreshes into one', async () => {
    let refreshes = 0;
    const tokens = new TokenManager({
      getAccessToken: async () => 'stale',
      refreshAccessToken: async () => {
        refreshes += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return 'fresh';
      },
    });

    const results = await Promise.all([
      tokens.refreshAccessToken(),
      tokens.refreshAccessToken(),
      tokens.refreshAccessToken(),
    ]);

    expect(refreshes).toBe(1);
    expect(results).toEqual(['fresh', 'fresh', 'fresh']);
  });

  it('treats a throwing refresh as no session rather than propagating', async () => {
    const tokens = new TokenManager({
      getAccessToken: async () => 'stale',
      refreshAccessToken: async () => {
        throw new Error('refresh token reuse detected');
      },
    });

    await expect(tokens.refreshAccessToken()).resolves.toBeNull();
  });

  it('treats an empty refreshed token as no session', async () => {
    const tokens = new TokenManager({
      getAccessToken: async () => 'stale',
      refreshAccessToken: async () => '',
    });

    await expect(tokens.refreshAccessToken()).resolves.toBeNull();
  });

  it('can refresh again after a previous refresh resolved', async () => {
    let refreshes = 0;
    const tokens = new TokenManager({
      getAccessToken: async () => 'stale',
      refreshAccessToken: async () => {
        refreshes += 1;
        return `fresh-${refreshes}`;
      },
    });

    await expect(tokens.refreshAccessToken()).resolves.toBe('fresh-1');
    await expect(tokens.refreshAccessToken()).resolves.toBe('fresh-2');
  });
});
