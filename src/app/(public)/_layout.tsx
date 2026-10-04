import { Stack } from 'expo-router';

import { background } from '@/theme';

/**
 * Public stack: everything a signed-out shopper can reach (PRD 2).
 */
export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: background },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ title: 'Shop' }} />
      {/* Product list and detail are public (PRD 14.4 step 1): a signed-out
          shopper browses without signing in. */}
      <Stack.Screen name="shop/[[department]]" options={{ title: 'Browse' }} />
      <Stack.Screen name="products/[slug]" options={{ title: 'Product' }} />
    </Stack>
  );
}
