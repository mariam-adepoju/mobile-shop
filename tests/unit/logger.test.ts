import { redactContext, redactString } from '@/lib/logger';

describe('redactString', () => {
  it('redacts a bearer header', () => {
    expect(redactString('Authorization: Bearer abc.def.ghi')).toContain('[redacted]');
    expect(redactString('Authorization: Bearer abc.def.ghi')).not.toContain('abc.def.ghi');
  });

  it('redacts a bare JWT anywhere in the line', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(redactString(`token was ${jwt} ok`)).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('redacts Nigerian phone numbers in local and +234 forms', () => {
    expect(redactString('call 08012345678 today')).not.toContain('08012345678');
    expect(redactString('call +2348012345678 today')).not.toContain('2348012345678');
  });

  it('redacts email addresses', () => {
    expect(redactString('signed in as shopper@example.com')).not.toContain('shopper@example.com');
  });

  it('redacts secrets carried in query strings but keeps the key', () => {
    const out = redactString('https://pay.test/cb?reference=ref_1&signature=deadbeef');
    expect(out).not.toContain('deadbeef');
    expect(out).toContain('signature=[redacted]');
  });

  it('leaves ordinary text untouched', () => {
    expect(redactString('loading departments')).toBe('loading departments');
  });
});

describe('redactContext', () => {
  it('replaces sensitive keys wholesale', () => {
    const out = redactContext({
      authorization: 'Bearer secret-token-value',
      access_token: 'at',
      accessToken: 'at',
      refresh_token: 'rt',
      password: 'hunter2',
      cookie: 'session=abc',
    }) as Record<string, unknown>;

    expect(out.authorization).toBe('[redacted]');
    expect(out.access_token).toBe('[redacted]');
    expect(out.accessToken).toBe('[redacted]');
    expect(out.refresh_token).toBe('[redacted]');
    expect(out.password).toBe('[redacted]');
    expect(out.cookie).toBe('[redacted]');
  });

  it('scrubs non-sensitive keys that still hold a secret', () => {
    const out = redactContext({ note: 'token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig' }) as Record<
      string,
      unknown
    >;
    expect(out.note).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('recurses into nested objects and arrays', () => {
    const out = redactContext({
      request: { headers: { authorization: 'Bearer abc' }, url: 'https://x.test/cart' },
      attempts: [{ token: 't1' }, { token: 't2' }],
    }) as Record<string, unknown>;

    expect(JSON.stringify(out)).not.toContain('abc');
    expect(JSON.stringify(out)).not.toContain('t1');
    expect(JSON.stringify(out)).not.toContain('t2');
  });

  it('keeps primitives and Dates readable', () => {
    const out = redactContext({
      status: 429,
      ok: false,
      at: new Date('2026-10-04T00:00:00.000Z'),
    }) as Record<string, unknown>;

    expect(out.status).toBe(429);
    expect(out.ok).toBe(false);
    expect(out.at).toBe('2026-10-04T00:00:00.000Z');
  });

  it('summarises errors without a stack trace', () => {
    const out = redactContext({
      error: new Error('failed for shopper@example.com'),
    }) as { error: { name: string; message: string } };

    expect(out.error.name).toBe('Error');
    expect(out.error.message).not.toContain('shopper@example.com');
  });

  it('stops recursing at the depth limit instead of hanging', () => {
    let deep: Record<string, unknown> = { end: true };
    for (let i = 0; i < 20; i += 1) deep = { nested: deep };

    expect(() => redactContext(deep)).not.toThrow();
    expect(JSON.stringify(redactContext(deep))).toContain('[depth-limit]');
  });

  it('survives a self-referencing object', () => {
    const cyclic: Record<string, unknown> = { name: 'loop' };
    cyclic.self = cyclic;

    expect(() => redactContext(cyclic)).not.toThrow();
  });
});
