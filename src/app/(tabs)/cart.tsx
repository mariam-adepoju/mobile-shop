import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, DemoStoreNotice, PriceText, Screen } from '@/components';
import { RequireAuth } from '@/components/require-auth';
import { shouldPollCart, useCart, useRemoveCartItem, useUpdateCartItem } from '@/features/cart';
import { ApiError } from '@/lib/api';
import { CART_POLL_INTERVAL_MS, getConfig } from '@/lib/config';
import { colors, radii, spacing } from '@/theme';

const IMAGE_ORIGIN = getConfig().apiBaseUrl.replace(/\/api\/v1\/?$/, '');
const imageUri = (url: string | null) => url === null ? null : /^https?:\/\//i.test(url) ? url : `${IMAGE_ORIGIN}/${url.replace(/^\/+/, '')}`;

export default function CartRoute() {
  return <RequireAuth><CartScreen /></RequireAuth>;
}

function CartScreen() {
  const cart = useCart();
  const refetchCart = cart.refetch;
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const [refreshing, setRefreshing] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useFocusEffect(useCallback(() => {
    void refetchCart();
    return undefined;
  }, [refetchCart]));

  useFocusEffect(useCallback(() => {
    if (!shouldPollCart(true, appActive)) return undefined;
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refetchCart(); }, CART_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [appActive, refetchCart]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setAppActive(active);
      if (active) void refetchCart();
    });
    return () => subscription.remove();
  }, [refetchCart]);

  const refresh = async () => {
    setRefreshing(true);
    try { await cart.refetch(); } finally { setRefreshing(false); }
  };
  const errorMessage = (error: unknown) => error instanceof ApiError
    ? error.message
    : error instanceof Error ? error.message : 'Please try again.';

  return (
    <Screen title="Cart">
      {cart.isPending ? (
        <View style={styles.loading} accessibilityLabel="Loading cart">
          <ActivityIndicator color={colors.primary} />
          <AppText role="body" color={colors.foggy}>Loading your cart…</AppText>
          <View style={styles.skeleton} /><View style={styles.skeleton} />
        </View>
      ) : cart.isError && !cart.data ? (
        <View style={styles.state}>
          <AppText role="body">We could not load your cart. {errorMessage(cart.error)}</AppText>
          <Button label="Try again" onPress={() => void cart.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        >
          {cart.isRefetchError ? (
            <View accessibilityRole="alert" style={styles.banner}>
              <AppText role="caption">Cart refresh failed. Your last cart is still shown. {errorMessage(cart.error)}</AppText>
              <Button label="Retry" variant="secondary" onPress={() => void cart.refetch()} />
            </View>
          ) : null}
          {update.isError || remove.isError ? (
            <View accessibilityRole="alert" style={styles.banner}>
              <AppText role="caption">{(update.error ?? remove.error)?.message ?? 'Your cart could not be changed. Please try again.'}</AppText>
            </View>
          ) : null}
          {cart.data?.items.length ? cart.data.items.map((line) => {
            const uri = imageUri(line.imageUrl);
            const busy = update.isPending || remove.isPending;
            return (
              <View key={line.productId} style={styles.line}>
                {uri ? <Image source={{ uri }} contentFit="cover" style={styles.image} accessibilityLabel={`${line.name} image`} /> : <View style={styles.imagePlaceholder} />}
                <View style={styles.details}>
                  <AppText role="ui" weight="semibold">{line.name}</AppText>
                  <PriceText amountMinor={line.unitPriceMinor} currency={cart.data.currency} role="ui" />
                  <View style={styles.actions}>
                    <StepButton label={`Decrease ${line.name} quantity`} symbol="−" disabled={busy || line.quantity <= 1} onPress={() => update.mutate({ productId: line.productId, quantity: line.quantity - 1 })} />
                    <AppText role="body" testID={`quantity-${line.productId}`}>{line.quantity}</AppText>
                    <StepButton label={`Increase ${line.name} quantity`} symbol="+" disabled={busy} onPress={() => update.mutate({ productId: line.productId, quantity: line.quantity + 1 })} />
                    <StepButton label={`Remove ${line.name} from cart`} symbol="×" disabled={busy} onPress={() => remove.mutate({ productId: line.productId })} />
                  </View>
                </View>
              </View>
            );
          }) : (
            <View style={styles.state}><AppText role="subheading" weight="semibold">Your cart is empty</AppText><AppText role="body" color={colors.foggy}>Items you add will appear here.</AppText></View>
          )}
          {cart.data?.items.length ? (
            <View style={styles.subtotal}>
              <AppText role="ui" weight="semibold">Subtotal</AppText>
              <PriceText amountMinor={cart.data.subtotalMinor} currency={cart.data.currency} role="heading" />
            </View>
          ) : null}
          <Button label="Checkout · Coming soon" disabled accessibilityHint="Checkout will be available in a later update." onPress={() => undefined} variant="secondary" />
          <AppText role="caption" color={colors.foggy}>Updated just now</AppText>
          <DemoStoreNotice />
        </ScrollView>
      )}
    </Screen>
  );
}

function StepButton({ label, symbol, disabled, onPress }: { label: string; symbol: string; disabled: boolean; onPress: () => void }) {
  return <Button label={symbol} accessibilityLabel={label} disabled={disabled} onPress={onPress} variant="secondary" />;
}

const styles = StyleSheet.create({
  content: { gap: spacing.four, padding: spacing.four, paddingBottom: spacing.section },
  loading: { gap: spacing.three, padding: spacing.four },
  skeleton: { backgroundColor: colors.deco, borderRadius: radii.card, height: 90 },
  state: { alignItems: 'center', gap: spacing.three, padding: spacing.six },
  banner: { backgroundColor: colors.faint, borderRadius: radii.control, gap: spacing.two, padding: spacing.three },
  line: { alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.card, flexDirection: 'row', gap: spacing.three, padding: spacing.three },
  image: { borderRadius: radii.control, height: 76, width: 76 },
  imagePlaceholder: { backgroundColor: colors.faint, borderRadius: radii.control, height: 76, width: 76 },
  details: { flex: 1, gap: spacing.one },
  actions: { alignItems: 'center', flexDirection: 'row', gap: spacing.two, marginTop: spacing.one },
  subtotal: { alignItems: 'center', borderTopColor: colors.bebe, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.three },
});
