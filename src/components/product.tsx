import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import type { ProductSummary } from '@/features/catalog';
import { formatMinor } from '@/lib/money';
import { colors, radii, spacing } from '@/theme';

/**
 * Renders a server price (PRD 10.1).
 *
 * `formatMinor` is display-only, so this component physically cannot compute a
 * price (MFR-16). A non-NGN currency is shown rather than mislabelled, which
 * `formatMoney` would throw on.
 */
export function PriceText({
  amountMinor,
  currency = 'NGN',
  role = 'ui',
  strikethrough = false,
}: {
  amountMinor: number;
  currency?: string;
  role?: 'ui' | 'subheading' | 'heading';
  strikethrough?: boolean;
}) {
  // `formatMoney` throws on an unsupported currency; showing the raw code is
  // better than crashing a whole screen over one bad field.
  const label =
    currency === 'NGN'
      ? formatMinor(amountMinor)
      : `${currency} ${formatMinor(amountMinor).replace(/^[^\d-]/, '')}`;

  return (
    <AppText
      role={role}
      weight="semibold"
      color={colors.hof}
      style={strikethrough ? styles.strikethrough : undefined}
    >
      {label}
    </AppText>
  );
}

/**
 * Availability badge (PRD 10.1, MFR-5).
 *
 * Always icon + text, never colour alone (PRD 11).
 */
export function StockBadge({ state }: { state: ProductSummary['purchaseState'] }) {
  const { label, glyph, tone } = STOCK_PRESENTATION[state];

  return (
    <View
      accessibilityLabel={`Availability: ${label}`}
      style={[styles.badge, { borderColor: tone }]}
    >
      <AppText role="caption" color={tone}>
        {`${glyph} ${label}`}
      </AppText>
    </View>
  );
}

/**
 * Prescription marker (PRD 10.1, MFR-5).
 *
 * Shown whenever the server says the item needs a prescription. A pharmacy
 * product with no Rx requirement renders nothing rather than a negative.
 */
export function RxBadge({ purchaseState }: { purchaseState: ProductSummary['purchaseState'] }) {
  if (purchaseState !== 'prescription_only') return null;

  return (
    <View accessibilityLabel="Prescription only" style={[styles.badge, styles.rxBorder]}>
      <AppText role="caption" color={colors.rausch600}>
        {'Rx · Prescription only'}
      </AppText>
    </View>
  );
}

const STOCK_PRESENTATION: Record<
  ProductSummary['purchaseState'],
  { label: string; glyph: string; tone: string }
> = {
  purchasable: { label: 'In stock', glyph: '●', tone: colors.primary },
  prescription_only: { label: 'Prescription only', glyph: '℞', tone: colors.rausch600 },
  out_of_stock: { label: 'Out of stock', glyph: '○', tone: colors.foggy },
  inactive: { label: 'Unavailable', glyph: '○', tone: colors.foggy },
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderColor: colors.bebe,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.one,
  },
  rxBorder: {
    borderColor: colors.rausch,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
});
