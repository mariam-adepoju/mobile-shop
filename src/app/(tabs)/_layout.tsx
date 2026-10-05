import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { AppText } from '@/components/text';
import { useAuthSession } from '@/features/auth';
import { useCart } from '@/features/cart';
import { CART_BADGE_POLL_INTERVAL_MS } from '@/lib/config';
import { background, colors } from '@/theme';

/** The cart badge shares the same query as the cart screen and product adds. */
export default function TabsLayout() {
  const { status } = useAuthSession();
  const cart = useCart({
    enabled: status === 'signed-in',
    refetchInterval: CART_BADGE_POLL_INTERVAL_MS,
  });
  const refetchCart = cart.refetch;
  useEffect(() => {
    if (status !== 'signed-in') return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetchCart();
    });
    return () => subscription.remove();
  }, [refetchCart, status]);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.foggy,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.bebe },
        sceneStyle: { backgroundColor: background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Shop', tabBarLabel: ({ color }) => <AppText role="caption" color={color}>Shop</AppText> }} />
      <Tabs.Screen name="cart" options={{
        title: 'Cart',
        tabBarBadge: (cart.data?.totalQuantity ?? 0) > 0 ? cart.data?.totalQuantity : undefined,
        tabBarLabel: ({ color }) => <AppText role="caption" color={color}>Cart</AppText>,
      }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarLabel: ({ color }) => <AppText role="caption" color={color}>Orders</AppText> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarLabel: ({ color }) => <AppText role="caption" color={color}>Account</AppText> }} />
    </Tabs>
  );
}
