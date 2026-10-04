import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getQueryClient } from '@/lib/query-client';
import { background } from '@/theme';

/**
 * Root layout: providers only, plus the navigator (AGENTS.md 5).
 *
 * All routing composition lives in `src/app/`; features own their own logic.
 */
export default function RootLayout() {
  // Created once per app instance, not per render.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {/* SDK 57: expo-status-bar dropped backgroundColor; the screen
            background comes from the navigator's contentStyle instead. */}
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: background },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="(public)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
