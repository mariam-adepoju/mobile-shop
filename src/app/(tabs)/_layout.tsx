import { Tabs } from 'expo-router';

import { AppText } from '@/components/text';
import { background, colors } from '@/theme';

/**
 * Signed-in tab bar.
 *
 * Screens are placeholders until their milestones: catalog lands in M3, cart
 * in M5, orders in M8 (PRD 17). The tab badge derives from `["cart"]` once the
 * cart feature exists (PRD 6.3).
 */
export default function TabsLayout() {
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shop',
          tabBarLabel: ({ color }) => (
            <AppText role="caption" color={color}>
              Shop
            </AppText>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarLabel: ({ color }) => (
            <AppText role="caption" color={color}>
              Cart
            </AppText>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarLabel: ({ color }) => (
            <AppText role="caption" color={color}>
              Orders
            </AppText>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarLabel: ({ color }) => (
            <AppText role="caption" color={color}>
              Account
            </AppText>
          ),
        }}
      />
    </Tabs>
  );
}
