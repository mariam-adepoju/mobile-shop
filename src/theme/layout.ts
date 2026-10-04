/**
 * Spacing and shape tokens, mirrored from `DESIGN.md` section 4.
 *
 * Base unit is 4px; density is compact and scannable.
 */

export const spacing = {
  none: 0,
  /** 4 - base unit */
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  /** 48 - DESIGN.md's section gap between content blocks. */
  section: 48,
} as const;

export const radii = {
  /** Cards. */
  card: 12,
  /** Inputs and inner surfaces. */
  control: 8,
  /** Pills, capsules, and every button. */
  pill: 9999,
} as const;

/**
 * The one permitted elevation, from DESIGN.md's `--shadow-subtle`.
 *
 * iOS uses shadow*, Android uses elevation; both are declared so a card looks
 * the same on either platform.
 */
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

/**
 * AGENTS.md 10: touch targets are at least 44x44pt.
 *
 * Apply as `minHeight`/`minWidth` on anything pressable.
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * DESIGN.md section 4 desktop constraints, adapted for a phone.
 *
 * The web shop caps content at 1280px; a phone never needs that, but the
 * `full` width is kept so web builds and phone builds share a layout.
 */
export const layout = {
  maxContentWidth: 1280,
  screenGutter: spacing.four,
} as const;