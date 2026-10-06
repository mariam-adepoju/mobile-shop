import { Ionicons } from '@expo/vector-icons';
import { useNetworkState } from 'expo-network';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { AppText } from '@/components/text';
import { useAuthSession } from '@/features/auth';
import { shouldRefetchOnReconnect, useCart } from '@/features/cart';
import { CART_BADGE_POLL_INTERVAL_MS } from '@/lib/config';
import { background, colors } from '@/theme';

/** The cart badge shares the same query as the cart screen and product adds. */
export default function TabsLayout() {
  const { status } = useAuthSession();
  const network = useNetworkState();
  const wasOnline = useRef(true);
  const cart = useCart({
    enabled: status === 'signed-in',
  });
  const refetchCart = cart.refetch;
  useEffect(() => {
    if (status !== 'signed-in') return undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      if (AppState.currentState === 'active') {
        timer = setInterval(() => { void refetchCart(); }, CART_BADGE_POLL_INTERVAL_MS);
      }
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refetchCart();
        start();
      } else {
        stop();
      }
    });
    start();
    return () => { subscription.remove(); stop(); };
  }, [refetchCart, status]);
  const online = network.isConnected !== false && network.isInternetReachable !== false;
  useEffect(() => {
    const shouldRefetch = shouldRefetchOnReconnect(wasOnline.current, online, AppState.currentState === 'active');
    wasOnline.current = online;
    if (status === 'signed-in' && shouldRefetch) void refetchCart();
  }, [online, refetchCart, status]);
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
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        tabBarLabel: ({ color }) => <AppText role="caption" color={color}>Home</AppText>
      }} />
      <Tabs.Screen name="shop/index" options={{
        title: 'Shop',
        tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" color={color} size={size} />,
        tabBarLabel: ({ color }) => <AppText role="caption" color={color}>Shop</AppText>,
      }} />
      <Tabs.Screen name="shop/[department]" options={{ href: null, title: 'Shop' }} />
      <Tabs.Screen name="cart" options={{
        title: 'Cart',
        tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" color={color} size={size} />,
        tabBarBadge: (cart.data?.totalQuantity ?? 0) > 0 ? cart.data?.totalQuantity : undefined,
        tabBarLabel: ({ color }) => <AppText role="caption" color={color}>Cart</AppText>,
      }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="account" options={{
        title: 'Account',
        tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        tabBarLabel: ({ color }) => <AppText role="caption" color={color}>Account</AppText>,
      }} />
    </Tabs>
  );
}
