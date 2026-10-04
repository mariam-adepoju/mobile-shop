import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, textStyles } from '@/components/text';
import { background, colors, spacing } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Renders a pull-to-refresh control. */
  onRefresh?: () => void;
  refreshing?: boolean;
}

/** Page shell: off-white canvas, title block, and optional pull-to-refresh. */
export function Screen({ children, title, subtitle, onRefresh, refreshing = false }: ScreenProps) {
  const body = (
    <View style={styles.content}>
      {title ? (
        <AppText
          accessibilityRole="header"
          role="heading"
          weight="bold"
          style={textStyles.screenTitle}
        >
          {title}
        </AppText>
      ) : null}
      {subtitle ? (
        <AppText role="body" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
      {children}
    </View>
  );

  if (!onRefresh) return <View style={styles.screen}>{body}</View>;

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      style={styles.screen}
    >
      {body}
    </ScrollView>
  );
}

interface StateViewProps {
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  testID?: string;
}

/** Empty state with a direct recovery action (DESIGN.md 6.2). */
export function EmptyState({ title, description, action, testID }: StateViewProps) {
  return (
    <View style={styles.state} testID={testID}>
      <AppText
        accessibilityRole="header"
        role="subheading"
        weight="semibold"
        style={styles.stateTitle}
      >
        {title}
      </AppText>
      {description ? <AppText role="body">{description}</AppText> : null}
      {action ? (
        <AppText role="ui" weight="semibold" color={colors.primary} style={styles.stateAction}>
          {action.label}
        </AppText>
      ) : null}
    </View>
  );
}

/** Error state. Never shows raw server text (AGENTS.md 3.9, DESIGN.md 6.3). */
export function ErrorState({ title, description, action, testID }: StateViewProps) {
  return <EmptyState testID={testID} title={title} description={description} action={action} />;
}

/** Structural skeleton matching the shape of the real list (DESIGN.md 6.1). */
export function SkeletonList({ rows = 4, testID }: { rows?: number; testID?: string }) {
  return (
    <View accessibilityLabel="Loading" testID={testID}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: '70%' }]} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Spinner for an inline region that is not a full list. */
export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View accessibilityLabel={label} style={styles.state}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: background,
    flexGrow: 1,
  },
  content: {
    padding: spacing.four,
  },
  subtitle: {
    marginBottom: spacing.four,
  },
  state: {
    alignItems: 'center',
    gap: spacing.two,
    paddingVertical: spacing.section,
  },
  stateTitle: {
    textAlign: 'center',
  },
  stateAction: {
    marginTop: spacing.two,
  },
  skeletonRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    flexDirection: 'row',
    gap: spacing.three,
    marginBottom: spacing.three,
    padding: spacing.three,
  },
  skeletonThumb: {
    backgroundColor: colors.deco,
    borderRadius: 8,
    height: 48,
    width: 48,
  },
  skeletonLines: {
    flex: 1,
    gap: spacing.two,
  },
  skeletonLine: {
    backgroundColor: colors.deco,
    borderRadius: 4,
    height: 10,
  },
  skeletonLineShort: {
    width: '40%',
  },
});
