import { useRef } from 'react';
import { View, StyleSheet } from 'react-native';

import { Button, DemoStoreNotice } from '@/components';
import { useAuthSession } from '@/features/auth';
import { colors, spacing } from '@/theme';
import { AppText } from '@/components';

/**
 * Sign-in gate (PRD 10, MFR-7).
 *
 * Google only, because Google is the required connection. There is no embedded
 * WebView and no password field: Auth Code + PKCE runs in the system browser.
 */
export default function SignInScreen() {
  const { configured, error, pendingRoute, signIn } = useAuthSession();
  // Guards a double tap: `loading` alone does not stop a second `press` event
  // that lands before React re-renders.
  const inFlight = useRef(false);

  const start = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await signIn();
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <View style={styles.container}>
      <AppText accessibilityRole="header" role="heading" weight="bold" style={styles.title}>
        Sign in to Daywell
      </AppText>

      <AppText role="body" style={styles.body}>
        {pendingRoute === undefined
          ? 'Use your Google account to check out, view orders and manage addresses.'
          : 'Sign in to continue.'}
      </AppText>

      {!configured ? (
        <AppText role="body" testID="sign-in-unconfigured">
          Sign-in is not configured in this build. Set EXPO_PUBLIC_AUTH0_DOMAIN,
          EXPO_PUBLIC_AUTH0_CLIENT_ID and EXPO_PUBLIC_AUTH0_AUDIENCE, then rebuild.
        </AppText>
      ) : (
        <Button
          accessibilityHint="Opens Google sign in in your browser"
          label="Continue with Google"
          onPress={() => void start()}
        />
      )}

      {error ? (
        <AppText accessibilityRole="alert" role="body" testID="sign-in-error">
          {error}
        </AppText>
      ) : null}

      <DemoStoreNotice />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    flex: 1,
    gap: spacing.three,
    justifyContent: 'center',
    padding: spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    marginBottom: spacing.two,
    textAlign: 'center',
  },
});
