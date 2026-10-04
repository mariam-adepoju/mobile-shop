import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { isPurchasable, productQueryOptions, type PharmacyAttributes } from '@/features/catalog';
import {
  AppText,
  Button,
  DemoStoreNotice,
  PriceText,
  RxBadge,
  SkeletonList,
  StockBadge,
} from '@/components';
import { ApiError, messageForErrorCode } from '@/lib/api';
import { colors, radii, spacing } from '@/theme';

/** Why an item cannot be bought, keyed by the server's own state (MFR-5). */
const BLOCKED_REASON: Record<string, string> = {
  prescription_only: 'This item is prescription-only. Speak to a pharmacist to get it.',
  out_of_stock: 'This item is currently out of stock.',
  inactive: 'This product is no longer available.',
};
export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const product = useQuery({ ...productQueryOptions(String(slug ?? '')), enabled: !!slug });

  if (product.isPending) {
    return (
      <View style={styles.content}>
        <SkeletonList rows={1} testID="product-loading" />
      </View>
    );
  }

  if (product.isError) {
    const description =
      product.error instanceof ApiError
        ? messageForErrorCode(product.error.code, product.error.message)
        : 'Please try again.';

    return (
      <View style={styles.content}>
        <AppText accessibilityRole="header" role="subheading" weight="bold">
          We could not load this product
        </AppText>
        <AppText role="body">{description}</AppText>
        <Button label="Try again" onPress={() => void product.refetch()} />
        <DemoStoreNotice />
      </View>
    );
  }

  const item = product.data;
  const purchasable = isPurchasable(item.purchaseState);
  const blockedReason = BLOCKED_REASON[item.purchaseState];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {item.imageUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit="cover"
          source={{ uri: item.imageUrl }}
          style={styles.hero}
          transition={150}
        />
      ) : null}

      {item.brand ? (
        <AppText role="caption" color={colors.foggy}>
          {item.brand}
        </AppText>
      ) : null}

      <AppText accessibilityRole="header" role="headingSm" weight="bold">
        {item.name}
      </AppText>

      {item.packSize ? (
        <AppText role="body" color={colors.foggy}>
          {item.packSize}
        </AppText>
      ) : null}

      <PriceText amountMinor={item.priceMinor} currency={item.currency} role="heading" />

      <View style={styles.badges}>
        <StockBadge state={item.purchaseState} />
        <RxBadge purchaseState={item.purchaseState} />
      </View>

      {blockedReason ? (
        <View accessibilityRole="alert" style={styles.blocked}>
          <AppText role="body">{blockedReason}</AppText>
        </View>
      ) : null}

      {item.description ? (
        <View style={styles.section}>
          <AppText accessibilityRole="header" role="ui" weight="semibold">
            Description
          </AppText>
          <AppText role="body">{item.description}</AppText>
        </View>
      ) : null}

      {/* MFR-4: pharmacy fields render only when the backend sends them. */}
      {item.pharmacy ? (
        <View style={styles.section}>
          <AppText accessibilityRole="header" role="ui" weight="semibold">
            Product details
          </AppText>
          <DetailRow label="Dosage form" value={item.pharmacy.dosageForm} />
          <DetailRow label="Strength" value={item.pharmacy.strength} />
          <DetailRow label="NAFDAC number" value={item.pharmacy.nafdacNumber} />
          <DetailRow label="Prescription" value={prescriptionLabel(item.pharmacy)} />
        </View>
      ) : null}

      {/*
        Add to cart needs auth (M4) and the cart mutation (M5), so the button
        states the server's truth and stays disabled with an explanation rather
        than faking a successful add.
      */}
      <View style={styles.footer}>
        <Button
          disabled={!purchasable}
          label={purchasable ? 'Add to cart' : 'Unavailable'}
          onPress={() => {
            // No-op until M5 wires the cart mutation.
          }}
        />
        <DemoStoreNotice />
      </View>
    </ScrollView>
  );
}

/** "Required" / "Not required", or nothing when the backend omitted it. */
function prescriptionLabel(pharmacy?: PharmacyAttributes | null): string | null {
  if (pharmacy?.requiresPrescription === true) return 'Required';
  if (pharmacy?.requiresPrescription === false) return 'Not required';
  return null;
}

/** One label/value pair; renders nothing when the backend omitted the value. */
function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <View style={styles.row}>
      <AppText role="body" color={colors.foggy} style={styles.rowLabel}>
        {label}
      </AppText>
      <AppText role="body">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.two,
    padding: spacing.four,
  },
  hero: {
    backgroundColor: colors.faint,
    borderRadius: radii.card,
    height: 220,
    width: '100%',
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.two,
    marginVertical: spacing.two,
  },
  blocked: {
    backgroundColor: colors.faint,
    borderRadius: radii.control,
    padding: spacing.three,
  },
  section: {
    gap: spacing.two,
    marginTop: spacing.four,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    flex: 1,
  },
  footer: {
    gap: spacing.four,
    marginTop: spacing.four,
  },
});
