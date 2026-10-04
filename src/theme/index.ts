/**
 * Design tokens for the Daywell app, mirrored from `DESIGN.md`.
 *
 * Components import from here; AGENTS.md 10 forbids hard-coded hex values and
 * magic spacing.
 */
export * from './colors';
export * from './typography';
export * from './layout';

/**
 * Mandatory regulatory notice (DESIGN.md 1, AGENTS.md 10).
 *
 * Must be visible in app chrome and on checkout. Pharmacy-adjacent products
 * are not dispensed by a licensed pharmacy, and the demo must not imply one.
 */
export const DEMO_STORE_NOTICE = 'Demo store — not a licensed pharmacy';