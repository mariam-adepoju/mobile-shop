import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  categoriesQueryOptions,
  flattenPages,
  isUnfiltered,
  productsQueryOptions,
  type ProductFilters,
} from '@/features/catalog';
import {
  Button,
  CategoryFilter,
  DemoStoreNotice,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ProductCard,
  SearchField,
  SkeletonList,
} from '@/components';
import {
  ApiError,
  ContractError,
  messageForErrorCode,
  NetworkError,
  TimeoutError,
} from '@/lib/api';
import { colors, spacing } from '@/theme';

/**
 * Product list with department, category and search filters (PRD 10).
 *
 * Filtering and search are performed by the server; this screen only sends the
 * filters and renders the result (MFR-2, MFR-3).
 */
export default function ShopScreen() {
  const { department } = useLocalSearchParams<{ department?: string | string[] }>();

  // `shop/[[department]]` is optional, so the param arrives as an array when a
  // catch-all segment matches more than once.
  const departmentSlug = Array.isArray(department) ? department[0] : department;

  const [categorySlug, setCategorySlug] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  const filters: ProductFilters = useMemo(
    () => ({ departmentSlug, categorySlug, search }),
    [departmentSlug, categorySlug, search],
  );

  const categories = useQuery(categoriesQueryOptions(departmentSlug));

  const products = useInfiniteQuery(productsQueryOptions(filters));
  const items = flattenPages(products.data);
  const hasFilters = !isUnfiltered(filters);

  const retryAll = useCallback(() => {
    void categories.refetch();
    void products.refetch();
  }, [categories, products]);

  const loadMore = useCallback(() => {
    if (products.hasNextPage && !products.isFetchingNextPage) {
      void products.fetchNextPage();
    }
  }, [products]);

  const showSkeleton = products.isPending;
  // A failed refresh keeps the previously loaded list on screen under a banner;
  // it must never blank the screen or clear the data (AGENTS.md 7).
  const showOffline = products.isError && products.data !== undefined;
  const showError = products.isError && products.data === undefined;
  const showEmpty = !showSkeleton && !showError && items.length === 0;

  if (showError) {
    return (
      <View style={styles.content}>
        <ProductErrorState error={products.error} onRetry={retryAll} />
        <DemoStoreNotice />
      </View>
    );
  }

  return (
    <FlatList
      ListEmptyComponent={
        showSkeleton ? (
          <SkeletonList testID="products-loading" />
        ) : showEmpty ? (
          <EmptyState
            description={
              hasFilters
                ? 'Try a different search or clear your filters.'
                : 'Products will appear here once they are listed.'
            }
            testID="products-empty"
            title={hasFilters ? 'No matching products' : 'No products yet'}
          />
        ) : null
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {products.hasNextPage ? (
            <Button
              label={products.isFetchingNextPage ? 'Loading' : 'Load more'}
              loading={products.isFetchingNextPage}
              onPress={loadMore}
              variant="secondary"
            />
          ) : null}
          <DemoStoreNotice />
        </View>
      }
      ListHeaderComponent={
        <View>
          {showOffline ? <OfflineBanner onRetry={retryAll} /> : null}
          <SearchField onChange={setSearch} />
          <CategoryFilter
            categories={categories.data ?? []}
            onSelect={setCategorySlug}
            selectedSlug={categorySlug}
          />
        </View>
      }
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          onRefresh={retryAll}
          refreshing={products.isRefetching}
          tintColor={colors.primary}
        />
      }
      renderItem={({ item }) => <ProductCard product={item} />}
      testID="products-list"
    />
  );
}

/** Local error copy; never surfaces raw server text (AGENTS.md 3.9). */
function ProductErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const description =
    error instanceof ApiError
      ? messageForErrorCode(error.code, error.message)
      : error instanceof ContractError ||
          error instanceof NetworkError ||
          error instanceof TimeoutError
        ? error.message
        : 'Please try again.';

  return (
    <ErrorState
      action={{ label: 'Try again', onPress: onRetry }}
      description={description}
      testID="products-error"
      title="We could not load products"
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.four,
  },
  footer: {
    gap: spacing.four,
    paddingVertical: spacing.four,
  },
});
