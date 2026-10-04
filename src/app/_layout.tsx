import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthSessionProvider } from '@/features/auth';
import { getQueryClient } from '@/lib/query-client';
import { setSessionHooks, setTokenManager } from '@/lib/api';
import { createAuth0TokenManager } from '@/features/auth';
import { getConfig } from '@/lib/config';
import { background } from '@/theme';

/**
 * Root layout: providers only, plus the navigator (AGENTS.md 5).
 *
 * All routing composition lives in `src/app/`; features own their own logic.
 */
export default function RootLayout() {
  // Created once per app instance, not per render.
  const queryClient = getQueryClient();

  // The API client is built once and shared. The token manager is read at call
  // time through a getter, so registering it here (after the client may already
  // exist) is enough; the client never needs rebuilding (AGENTS.md 6.4).
  const { auth0 } = getConfig();
  if (auth0.configured) {
    setTokenManager(createAuth0TokenManager());
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
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
      </AuthSessionProvider>
    </QueryClientProvider>
  );
}
