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
    </Stack>
  );
}
