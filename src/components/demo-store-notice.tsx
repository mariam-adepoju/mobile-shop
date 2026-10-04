import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { DEMO_STORE_NOTICE, colors, spacing } from '@/theme';

/**
 * Mandatory regulatory notice (DESIGN.md 1, AGENTS.md 10).
 *
 * Must be visible in app chrome and again on checkout. Pharmacy-adjacent
 * products must never imply a licensed dispenser.
 */
export function DemoStoreNotice() {
  return (
    <View accessibilityRole="text" style={styles.container} testID="demo-store-notice">
      <AppText role="caption" color={colors.foggy} style={styles.text}>
        {DEMO_STORE_NOTICE}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.four,
    paddingVertical: spacing.three,
  },
  text: {
    textAlign: 'center',
  },
});
