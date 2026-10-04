import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import type { Category } from '@/features/catalog';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/theme';

/**
 * Non-blocking offline notice (PRD 10.1, PRD 11).
 *
 * Must never clear the data already on screen: a failed refresh shows this and
 * leaves the stale-but-usable list visible (AGENTS.md 7).
 */
export function OfflineBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={styles.offline}
      testID="offline-banner"
    >
      <AppText role="caption" color={colors.hof} style={styles.offlineText}>
        You are offline. Showing the last loaded products.
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry connection"
        hitSlop={8}
        onPress={onRetry}
        style={styles.offlineAction}
      >
        <AppText role="caption" weight="semibold" color={colors.primary}>
          Retry
        </AppText>
      </Pressable>
    </View>
  );
}

/**
 * Horizontal category filter (MFR-2).
 *
 * Selection is a parent concern: this only reports the chosen slug, so the
 * screen owns the filter state and the query key that follows from it.
 */
export function CategoryFilter({
  categories,
  selectedSlug,
  onSelect,
}: {
  categories: Category[];
  selectedSlug?: string;
  onSelect: (slug: string | undefined) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <View accessibilityRole="tablist" style={styles.filterRow} testID="category-filter">
      <CategoryChip
        label="All"
        selected={!selectedSlug}
        onPress={() => onSelect(undefined)}
        testID="category-chip-all"
      />
      {categories.map((category) => (
        <CategoryChip
          key={category.id}
          label={category.name}
          selected={category.slug === selectedSlug}
          onPress={() =>
            // Tapping the active chip clears it, so a filter never traps the user.
            onSelect(category.slug === selectedSlug ? undefined : category.slug)
          }
          testID={`category-chip-${category.slug}`}
        />
      ))}
    </View>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : null]}
      testID={testID}
    >
      <AppText
        role="caption"
        weight={selected ? 'semibold' : 'regular'}
        color={selected ? colors.white : colors.hof}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  offline: {
    alignItems: 'center',
    backgroundColor: colors.deco,
    borderRadius: radii.control,
    flexDirection: 'row',
    gap: spacing.two,
    justifyContent: 'space-between',
    marginBottom: spacing.three,
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
  },
  offlineText: {
    flex: 1,
  },
  offlineAction: {
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET / 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.two,
    paddingBottom: spacing.three,
  },
  chip: {
    alignItems: 'center',
    borderColor: colors.bebe,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.four,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
