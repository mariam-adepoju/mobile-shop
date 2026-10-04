import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { PriceText, RxBadge, StockBadge } from '@/components/product';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/theme';

import type { ProductSummary } from '@/features/catalog';

/**
 * Product row for the catalog list (DESIGN.md 5, PRD 10.1).
 *
 * Purely presentational: it renders the server's price, badges and purchase
 * state, and navigates. It holds no stock logic and computes no money
 * (AGENTS.md 5).
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      asChild
      href={{ pathname: '/products/[slug]', params: { slug: product.slug } }}
      // Announce the whole card as one target with the price and state, so a
      // screen reader does not read six disconnected fragments.
      accessibilityLabel={`${product.name}${product.brand ? `, ${product.brand}` : ''}, ${product.purchaseState.replace(/_/g, ' ')}`}
      accessibilityRole="button"
    >
      <Pressable
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
        testID={`product-card-${product.slug}`}
      >
        <ProductThumbnail imageUrl={product.imageUrl} name={product.name} />

        <View style={styles.body}>
          {product.brand ? (
            <AppText role="caption" color={colors.foggy} numberOfLines={1}>
              {product.brand}
            </AppText>
          ) : null}

          <AppText numberOfLines={2} role="ui" weight="semibold">
            {product.name}
          </AppText>

          {product.packSize ? (
            <AppText role="caption" color={colors.foggy}>
              {product.packSize}
            </AppText>
          ) : null}

          <PriceText amountMinor={product.priceMinor} currency={product.currency} />

          <View style={styles.badges}>
            <StockBadge state={product.purchaseState} />
            <RxBadge purchaseState={product.purchaseState} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

/**
 * Product image with a text placeholder.
 *
 * `expo-image` is already a dependency (PRD 13 asks for its caching), and the
 * placeholder keeps the row from collapsing while loading or on failure.
 */
function ProductThumbnail({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  return (
    <View style={styles.thumbnail}>
      {imageUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit="cover"
          placeholder={{ blurhash: undefined }}
          source={{ uri: imageUrl }}
          style={styles.image}
          transition={150}
        />
      ) : (
        <AppText role="caption" color={colors.foggy} numberOfLines={2} style={styles.thumbText}>
          {name}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    flexDirection: 'row',
    gap: spacing.three,
    marginBottom: spacing.three,
    minHeight: MIN_TOUCH_TARGET,
    padding: spacing.three,
  },
  pressed: {
    opacity: 0.9,
  },
  thumbnail: {
    alignItems: 'center',
    backgroundColor: colors.faint,
    borderRadius: radii.control,
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  thumbText: {
    paddingHorizontal: spacing.one,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.one,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
    marginTop: spacing.one,
  },
});
