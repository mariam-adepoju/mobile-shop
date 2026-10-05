import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { departmentsQueryOptions, type Department } from '@/features/catalog';
import { AppText } from '@/components/text';
import { DemoStoreNotice } from '@/components/demo-store-notice';
import { EmptyState, ErrorState, Screen, SkeletonList } from '@/components/screen';
import {
  ApiError,
  ContractError,
  messageForErrorCode,
  NetworkError,
  TimeoutError,
} from '@/lib/api';
import { colors, radii, spacing } from '@/theme';

/**
 * Catalog landing screen.
 *
 * Public: a signed-out shopper sees this with no login (PRD 14.4 step 1).
 * Loading, empty and error states all come from AGENTS.md 10.
 */
export default function HomeScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(departmentsQueryOptions());

  return (
    <Screen
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      subtitle="Browse the same catalog the website serves."
      title="Shop departments"
    >
      {isPending ? <SkeletonList testID="departments-loading" /> : null}

      {isError ? (
        <ErrorState
          action={{ label: 'Try again', onPress: () => void refetch() }}
          description={describeError(error)}
          testID="departments-error"
          title="We could not load the catalog"
        />
      ) : null}

      {data && data.length === 0 ? (
        <EmptyState
          description="New departments are added regularly."
          testID="departments-empty"
          title="No departments yet"
        />
      ) : null}

      {data && data.length > 0 ? (
        <View testID="departments-list">
          {data.map((department) => (
            <DepartmentRow key={department.id} department={department} />
          ))}
        </View>
      ) : null}

      <DemoStoreNotice />
    </Screen>
  );
}

/**
 * One tappable department row (MFR-1 -> MFR-2).
 *
 * A `Link`, not a styled `View`: a role of "button" on a non-pressable view
 * lies to a screen reader (AGENTS.md 10).
 */
function DepartmentRow({ department }: { department: Department }) {
  return (
    <Link
      asChild
      accessibilityRole="button"
      href={{ pathname: '/shop/[department]', params: { department: department.slug } }}
      style={styles.row}
      testID={`department-${department.slug}`}
    >
      <Pressable
        accessibilityLabel={
          department.description ? `${department.name}. ${department.description}` : department.name
        }
        style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      >
        <AppText role="ui" weight="semibold">
          {department.name}
        </AppText>
        {department.description ? (
          <AppText role="body" style={styles.description}>
            {department.description}
          </AppText>
        ) : null}
      </Pressable>
    </Link>
  );
}

/** Never surfaces raw server text (AGENTS.md 3.9). */
function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return messageForErrorCode(error.code, error.message);
  }
  if (
    error instanceof ContractError ||
    error instanceof NetworkError ||
    error instanceof TimeoutError
  ) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    gap: spacing.one,
    marginBottom: spacing.three,
    minHeight: 64,
    padding: spacing.four,
  },
  description: {
    color: colors.foggy,
  },
  pressed: {
    opacity: 0.9,
  },
});
