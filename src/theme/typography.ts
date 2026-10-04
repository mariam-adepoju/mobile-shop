/**
 * Type scale, mirrored from `DESIGN.md` section 3.
 *
 * `fontFamily` is the system geometric sans; DESIGN.md specifies Inter with a
 * system fallback, and shipping a custom font is not required for M2.
 */

export const fontFamily = {
  sans: undefined, // `undefined` lets React Native use the platform system font
} as const;

export const fontSize = {
  caption: 11,
  body: 14,
  ui: 16,
  subheading: 20,
  headingSm: 22,
  heading: 28,
} as const;

/** Line height as a multiplier, matching DESIGN.md's unitless values. */
export const lineHeight = {
  caption: 1.18,
  body: 1.43,
  ui: 1.25,
  subheading: 1.2,
  headingSm: 1.18,
  heading: 1.43,
} as const;

export const letterSpacing = {
  caption: 0,
  body: -0.009,
  ui: 0,
  subheading: -0.18,
  headingSm: -0.44,
  heading: 0,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export type TextRole = keyof typeof fontSize;

/**
 * AGENTS.md 10: text must scale with the system font size without clipping.
 *
 * `allowFontScaling` defaults to true on `Text`; this helper keeps it explicit
 * at the few places where a scale cap is deliberate.
 */
export const allowFontScaling = true;