/**
 * Money formatting for display only (AGENTS.md 5).
 *
 * The server is the source of truth for every price, subtotal, delivery fee
 * and total. This module may only turn an amount the server already sent into
 * a string. It deliberately exposes NO arithmetic: there is no `add`, `sum`,
 * `multiply` or `compare` here, so a component physically cannot compute money
 * that the server did not send (AGENTS.md 3.2, PRD MFR-16).
 */

/** Integer minor units, e.g. kobo. `150000` means ₦1,500.00. */
export type MinorUnits = number;

/** The only currency the Daywell API deals in (PRD 7.1). */
export const CURRENCY = 'NGN' as const;

/**
 * The currency glyph and the grouped integer are derived from `Intl` rather
 * than hard-coded, so the output stays locale-correct.
 *
 * Note: a `style: 'currency'` formatter already emits its own two decimal
 * places, so it cannot be used to render the major part. Instead the symbol is
 * lifted out of `formatToParts` and the grouped integer is produced with a
 * plain integer formatter.
 */
const currencySymbol = (() => {
  const probe = new Intl.NumberFormat('en-NG', { style: 'currency', currency: CURRENCY });
  return probe.formatToParts(0).find((part) => part.type === 'currency')?.value ?? '₦';
})();

const groupInteger = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: true,
});

function assertMinorUnits(amount: MinorUnits): void {
  if (!Number.isFinite(amount)) {
    throw new TypeError(`formatMinor expects a finite number, got ${String(amount)}.`);
  }
  if (!Number.isInteger(amount)) {
    // A fractional minor unit means money already went through a float, which
    // AGENTS.md 5 forbids. Fail loudly rather than silently rounding.
    throw new TypeError(`formatMinor expects integer minor units, got ${amount}.`);
  }
}

/**
 * Format integer minor units as a Naira string, e.g. `150000` -> `₦1,500.00`.
 *
 * Division is only ever used to render the decimal part, never to derive a
 * value for a business decision, so there is no floating-point arithmetic on
 * the stored amount itself.
 */
export function formatMinor(amount: MinorUnits): string {
  assertMinorUnits(amount);

  // Absorb any negative sign before splitting, then re-apply it.
  const isNegative = amount < 0;
  const absolute = Math.abs(amount);
  const major = Math.trunc(absolute / 100);
  const minor = absolute % 100;

  const rendered = `${currencySymbol}${groupInteger.format(major)}.${String(minor).padStart(2, '0')}`;
  return isNegative ? `-${rendered}` : rendered;
}

/**
 * Format an amount plus a server-supplied currency.
 *
 * Guards against the app silently labelling a non-NGN total as Naira; the
 * backend owns the currency of every amount it returns.
 */
export function formatMoney(amount: MinorUnits, currency: string = CURRENCY): string {
  if (currency !== CURRENCY) {
    throw new RangeError(`Unsupported currency "${currency}"; expected ${CURRENCY}.`);
  }
  return formatMinor(amount);
}

/**
 * Compare two server-supplied amounts. Provided only so equality checks in
 * cache logic stay integer-safe; it is not a pricing decision.
 */
export function minorEquals(a: MinorUnits, b: MinorUnits): boolean {
  assertMinorUnits(a);
  assertMinorUnits(b);
  return a === b;
}
