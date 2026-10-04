/**
 * Catalog feature (AGENTS.md 5).
 *
 * Domain logic, schemas and queries only. Other features import this module
 * through `index.ts` and never reach into its files.
 */
export {
  CategoryListSchema,
  CategorySchema,
  DepartmentListSchema,
  DepartmentSchema,
  PRODUCTS_PAGE_SIZE,
  PharmacyAttributesSchema,
  ProductDetailSchema,
  ProductPageSchema,
  ProductSummarySchema,
  PurchaseStateSchema,
  isPurchasable,
  isUnfiltered,
  type Category,
  type Department,
  type DepartmentList,
  type PharmacyAttributes,
  type ProductDetail,
  type ProductFilters,
  type ProductPage,
  type ProductSummary,
  type PurchaseState,
} from './schemas';
export {
  categoriesKey,
  categoriesQueryOptions,
  departmentsKey,
  departmentsQueryOptions,
  fetchCategories,
  fetchDepartments,
  fetchProduct,
  fetchProductsPage,
  flattenPages,
  productDetailKey,
  productQueryOptions,
  productsKey,
  productsQueryOptions,
  type ProductPageResult,
} from './queries';
