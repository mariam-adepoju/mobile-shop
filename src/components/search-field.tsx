import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/text';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/theme';

/** Debounce for search, per PRD 13 (~300 ms). */
export const SEARCH_DEBOUNCE_MS = 300;

export interface SearchFieldProps {
  /** Called with the debounced term. */
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Catalog search box (MFR-3: search by name and brand).
 *
 * Debounces before reporting, so typing does not fire a request per keystroke.
 * Matching stays on the server: the app sends the term and renders what comes
 * back (AGENTS.md 3.2).
 */
export function SearchField({ onChange, placeholder = 'Search products' }: SearchFieldProps) {
  const [term, setTerm] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();

  const update = (next: string) => {
    setTerm(next);
    // Clear any pending report so only the final keystroke wins.
    if (timer) clearTimeout(timer);
    setTimer(
      setTimeout(() => {
        onChange(next);
      }, SEARCH_DEBOUNCE_MS),
    );
  };

  const clear = () => {
    if (timer) clearTimeout(timer);
    setTerm('');
    onChange('');
  };

  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel="Search products"
        // Fires immediately; the debounce lives in update(), so the reported
        // value is the one the screen's query key uses.
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={update}
        placeholder={placeholder}
        placeholderTextColor={colors.grey500}
        returnKeyType="search"
        style={styles.input}
        testID="search-input"
        value={term}
      />
      {term.length > 0 ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={12}
          onPress={clear}
          style={styles.clear}
          testID="search-clear"
        >
          <AppText role="body" color={colors.foggy}>
            {'×'}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.bebe,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.three,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.four,
  },
  input: {
    color: colors.hof,
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.two,
  },
  clear: {
    alignItems: 'center',
    height: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET,
  },
});
