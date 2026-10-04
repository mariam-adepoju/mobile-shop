import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ColorValue, type TextStyle } from 'react-native';

import {
  colors,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  radii,
  spacing,
  text,
  textMuted,
  type TextRole,
} from '@/theme';

interface AppTextProps {
  children: ReactNode;
  /** Visual role from DESIGN.md's type scale. */
  role?: TextRole;
  weight?: keyof typeof fontWeight;
  /**
   * Token colour, or any React Native colour value. Typed as `ColorValue`
   * because navigators hand tab tints to their label renderers.
   */
  color?: ColorValue;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  /**
   * Announced role; defaults to a heading for semibold text.
   *
   * `alert` is a live-region role: use it for a message that appears without the
   * user asking for it, such as a sign-in failure (AGENTS.md 10).
   */
  accessibilityRole?: 'header' | 'text' | 'link' | 'alert';
  /** Stable hook for tests and for `getByText`-style queries. */
  testID?: string;
}

/**
 * Every piece of body copy in the app goes through here, so the DESIGN.md
 * scale cannot be bypassed by hand-picked font sizes.
 */
export function AppText({
  children,
  role = 'body',
  weight = 'regular',
  color = text,
  style,
  numberOfLines,
  accessibilityRole,
  testID,
}: AppTextProps) {
  return (
    <Text
      // AGENTS.md 10: text must scale with the system font size.
      allowFontScaling
      accessibilityRole={accessibilityRole ?? (weight === 'semibold' ? 'header' : 'text')}
      numberOfLines={numberOfLines}
      testID={testID}
      style={[
        {
          color,
          fontSize: fontSize[role],
          fontWeight: fontWeight[weight],
          letterSpacing: letterSpacing[role],
          lineHeight: Math.round(fontSize[role] * lineHeight[role]),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export const textStyles = StyleSheet.create({
  screenTitle: { marginBottom: spacing.two },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.four,
  },
});

export { text, textMuted };
export type { TextRole };

/** Convenience wrapper for a card surface (DESIGN.md 5, Product Card). */
export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[textStyles.card, style]}>{children}</View>;
}
