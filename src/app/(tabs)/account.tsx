import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, DemoStoreNotice, SkeletonList } from '@/components';
import { meQueryOptions } from '@/features/account';
import { useAuthSession } from '@/features/auth';
import { ApiError, messageForErrorCode } from '@/lib/api';
import { colors, spacing } from '@/theme';

/**
 * Account screen (PRD 10, MFR-9, MFR-10).
 *
 * Shows the email and name that `GET /me` returns. That endpoint resolves the
 * Auth0 `sub` to the same local user row the web login uses, so a matching
 * email here is the graded-core proof that both clients share one identity.
 */
export default function AccountScreen() {
  const { status, requireSignIn } = useAuthSession();

  if (status === 'restoring') {
    return <View style={styles.content}><SkeletonList rows={2} testID="account-loading" /></View>;
  }

  if (status === 'signed-out') {
    return (
      <View style={styles.content} testID="account-signed-out">
        <AppText accessibilityRole="header" role="heading" weight="bold">Your account</AppText>
        <AppText role="body">Sign in with your Google account to view your profile and shared cart.</AppText>
        <Button
          label="Sign in with Google"
          onPress={() => {
            requireSignIn('/account');
            router.push('/sign-in');
          }}
        />
        <DemoStoreNotice />
      </View>
    );
  }

  return (
    <AccountProfile />
  );
}

/** Split out so the query only exists inside the authenticated subtree. */
function AccountProfile() {
  const { signOut } = useAuthSession();
  const me = useQuery(meQueryOptions());

  if (me.isPending) {
    return (
      <View style={styles.content}>
        <SkeletonList rows={2} testID="account-loading" />
      </View>
    );
  }

  if (me.isError) {
    const description =
      me.error instanceof ApiError
        ? messageForErrorCode(me.error.code, me.error.message)
        : 'Please try again.';

    return (
      <View style={styles.content}>
        <AppText accessibilityRole="header" role="subheading" weight="bold">
          We could not load your profile
        </AppText>
        <AppText role="body">{description}</AppText>
        <Button label="Try again" onPress={() => void me.refetch()} />
        <DemoStoreNotice />
      </View>
    );
  }

  return (
    <View style={styles.content} testID="account-profile">
      <AppText accessibilityRole="header" role="heading" weight="bold">
        Account
      </AppText>

      {/* Key order matters for MFR-9: the email is what gets compared against the
          web session, so it is rendered first and labelled explicitly. */}
      <View style={styles.row}>
        <AppText role="caption" color={colors.foggy}>
          Email
        </AppText>
        <AppText role="ui" weight="semibold" testID="account-email">
          {me.data.email}
        </AppText>
      </View>

      <View style={styles.row}>
        <AppText role="caption" color={colors.foggy}>
          Name
        </AppText>
        <AppText role="ui" weight="semibold" testID="account-name">
          {me.data.name}
        </AppText>
      </View>

      {me.data.phone ? (
        <View style={styles.row}>
          <AppText role="caption" color={colors.foggy}>
            Phone
          </AppText>
          <AppText role="ui" testID="account-phone">
            {me.data.phone}
          </AppText>
        </View>
      ) : null}

      <Button label="Sign out" onPress={() => void signOut()} variant="secondary" />
      <DemoStoreNotice />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.white,
    flex: 1,
    gap: spacing.three,
    padding: spacing.four,
  },
  row: {
    gap: spacing.one,
  },
});
