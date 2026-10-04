/**
 * Typed fixtures and the mock transport for `EXPO_PUBLIC_API_MODE=mock`.
 *
 * Removable once the backend Tier 1 slice is live (PRD 4.4).
 */
export {
  categoriesResponse,
  departmentsBareArrayResponse,
  departmentsResponse,
  errorResponse,
  findProductFixture,
  healthResponse,
  productsResponse,
} from './fixtures';
export { createMockFetch, hasMockRoute, type MockFetchOptions } from './mock-fetch';
