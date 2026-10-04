import { CURRENCY, formatMinor, formatMoney, minorEquals } from '@/lib/money';

describe('formatMinor', () => {
  it('formats zero', () => {
    expect(formatMinor(0)).toBe('₦0.00');
  });

  it('formats a round naira amount', () => {
    expect(formatMinor(150_000)).toBe('₦1,500.00');
  });

  it('formats kobo that do not reach a whole naira', () => {
    expect(formatMinor(50)).toBe('₦0.50');
    expect(formatMinor(1)).toBe('₦0.01');
    expect(formatMinor(99)).toBe('₦0.99');
  });

  it('keeps two decimal places for amounts above 1000 naira', () => {
    expect(formatMinor(1_234_567)).toBe('₦12,345.67');
  });

  it('handles values beyond Number.MAX_SAFE_INTEGER without drift', () => {
    // 90,071,992,547,409.91 naira: far beyond any realistic order, but it
    // proves the split is integer arithmetic rather than a float divide.
    expect(formatMinor(Number.MAX_SAFE_INTEGER)).toBe('₦90,071,992,547,409.91');
  });

  it('formats negative amounts', () => {
    expect(formatMinor(-2_500)).toBe('-₦25.00');
  });

  it('rejects a fractional minor unit instead of silently rounding', () => {
    expect(() => formatMinor(10.5)).toThrow(/integer minor units/);
  });

  it('rejects non-finite values', () => {
    expect(() => formatMinor(Number.NaN)).toThrow(/finite/);
    expect(() => formatMinor(Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });
});

describe('formatMoney', () => {
  it('defaults to NGN', () => {
    expect(formatMoney(250_000)).toBe('₦2,500.00');
  });

  it('accepts the server currency when it matches', () => {
    expect(formatMoney(250_000, CURRENCY)).toBe('₦2,500.00');
  });

  it('refuses to label a non-NGN amount as Naira', () => {
    expect(() => formatMoney(250_000, 'USD')).toThrow(/Unsupported currency/);
  });
});

describe('minorEquals', () => {
  it('compares integer minor units exactly', () => {
    expect(minorEquals(1_500, 1_500)).toBe(true);
    expect(minorEquals(1_500, 1_501)).toBe(false);
  });

  it('rejects fractional input', () => {
    expect(() => minorEquals(1.5, 1.5)).toThrow(/integer minor units/);
  });
});
