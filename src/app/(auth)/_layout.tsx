import { Stack } from 'expo-router';

import { background } from '@/theme';

/**
 * Auth stack: sign-in and its successors, added in M4.
 *
 * It exists now so navigation structure is settled before the Auth0 SDK is
 * wired up, and so the session guard has a destination to route to.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: background } }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
