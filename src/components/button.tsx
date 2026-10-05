import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** Blocks a second press while an action is in flight. */
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
  accessibilityLabel?: string;
}

/**
 * Primary action button (DESIGN.md 5: pill, retail green).
 *
 * `loading` both disables the press and shows a spinner, which is how a
 * double-tap on "Pay" is prevented (PRD MFR-24).
 */
export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  accessibilityHint,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Loading"
            color={variant === 'primary' ? colors.white : colors.primary}
            size="small"
          />
        ) : null}
        <AppText
          role="ui"
          weight="semibold"
          color={variant === 'primary' ? colors.white : colors.primary}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.six,
    paddingVertical: spacing.three,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.white,
    borderColor: colors.bebe,
    borderWidth: 1,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
