/**
 * Colour tokens, mirrored from `DESIGN.md` section 2.
 *
 * AGENTS.md 10 forbids hard-coded hex values in components: import from here
 * so a brand change is one edit.
 */
export const colors = {
  /** Retail green. Primary CTA: add-to-cart, checkout, success. */
  primary: '#16a34a',
  /** Active/hover state for primary actions. */
  primaryHover: '#15803d',
  /** Coral. Wishlist hearts, urgent badges, safety highlights only. */
  rausch: '#ff385c',
  rausch600: '#e00b41',
  /** Near-black. Primary text, body copy, headings, icon strokes. */
  hof: '#222222',
  /** Secondary text, muted labels, helper copy. */
  foggy: '#6a6a6a',
  /** Disabled text and input placeholders. */
  grey500: '#c1c1c1',
  /** Hairline borders, input underlines, dividers. */
  bebe: '#ebebeb',
  /** Skeleton placeholders and disabled surfaces. */
  deco: '#dddddd',
  /** Page canvas and footer surface. */
  faint: '#f7f7f7',
  white: '#ffffff',
} as const;

export type ColorToken = keyof typeof colors;

/** The app is single-theme; DESIGN.md defines no dark palette yet. */
export const background = colors.faint;
export const surface = colors.white;
export const border = colors.bebe;
export const text = colors.hof;
export const textMuted = colors.foggy;
export const accent = colors.primary;
