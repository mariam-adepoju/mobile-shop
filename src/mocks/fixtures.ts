/**
 * Typed fixtures for `EXPO_PUBLIC_API_MODE=mock` (PRD 4.4, AGENTS.md 9).
 *
 * This layer is removable: once the backend Tier 1 slice is deployed, delete
 * `src/mocks` and the `mock` branch of `createApiClient`.
 *
 * The fixtures are raw wire payloads, NOT pre-validated objects. They go
 * through the same envelope parsing and Zod validation as a live response, so
 * mock mode exercises the real client rather than a bypass.
 */

export const departmentsResponse = {
  data: {
    departments: [
      {
        id: 'dept_pharmacy',
        slug: 'pharmacy',
        name: 'Pharmacy',
        description: 'Everyday OTC medicines and wellness essentials.',
        imageUrl: null,
        sortOrder: 1,
      },
      {
        id: 'dept_supermarket',
        slug: 'supermarket',
        name: 'Supermarket',
        description: 'Groceries, drinks and household staples.',
        imageUrl: null,
        sortOrder: 2,
      },
      {
        id: 'dept_personal-care',
        slug: 'personal-care',
        name: 'Personal Care',
        description: 'Skincare, haircare and hygiene.',
        imageUrl: null,
        sortOrder: 3,
      },
      {
        id: 'dept_baby',
        slug: 'baby-and-child',
        name: 'Baby & Child',
        description: 'Diapers, formula and baby essentials.',
        imageUrl: null,
        sortOrder: 4,
      },
    ],
  },
};

/** The shape the union schema also accepts, for contract coverage. */
export const departmentsBareArrayResponse = {
  data: [
    {
      id: 'dept_pharmacy',
      slug: 'pharmacy',
      name: 'Pharmacy',
      description: 'Everyday OTC medicines and wellness essentials.',
      imageUrl: null,
      sortOrder: 1,
    },
  ],
};

export const healthResponse = {
  data: { status: 'ok', service: 'mock-api', timestamp: '2026-01-01T00:00:00.000Z' },
};

/** Demonstrates the error envelope the app must render distinctly. */
export const errorResponse = {
  error: {
    code: 'PRODUCT_UNAVAILABLE',
    message: 'This product is not available right now.',
    fieldErrors: {},
  },
};
