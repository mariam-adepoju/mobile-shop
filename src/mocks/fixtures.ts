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

/**
 * Product fixtures (PRD 4.1 `GET /catalog/products`).
 *
 * Deliberately covers every `purchaseState` so MFR-5 is exercisable in mock
 * mode: a purchasable item, a prescription-only item, an out-of-stock item and
 * an inactive one. Prices are integer kobo exactly as the backend sends them.
 */
const products = [
  {
    id: 'prod_paracetamol',
    slug: 'paracetamol-500mg-20-tabs',
    name: 'Paracetamol 500mg',
    brand: 'Emotex',
    priceMinor: 150000,
    currency: 'NGN',
    imageUrl: null,
    departmentSlug: 'pharmacy',
    categorySlug: 'pain-relief',
    packSize: '20 tablets',
    purchaseState: 'purchasable',
  },
  {
    id: 'prod_ibuprofen',
    slug: 'ibuprofen-400mg-12-tabs',
    name: 'Ibuprofen 400mg',
    brand: 'Brufen',
    priceMinor: 220000,
    currency: 'NGN',
    imageUrl: null,
    departmentSlug: 'pharmacy',
    categorySlug: 'pain-relief',
    packSize: '12 tablets',
    // MFR-5: the server states it; the app never infers this.
    purchaseState: 'prescription_only',
  },
  {
    id: 'prod_vitamin_c',
    slug: 'vitamin-c-1000mg',
    name: 'Vitamin C 1000mg',
    brand: "Nature's Way",
    priceMinor: 480000,
    currency: 'NGN',
    imageUrl: null,
    departmentSlug: 'pharmacy',
    categorySlug: 'vitamins-supplements',
    packSize: '60 effervescent tablets',
    purchaseState: 'out_of_stock',
  },
  {
    id: 'prod_whole_milk',
    slug: 'whole-milk-1l',
    name: 'Whole Milk',
    brand: 'Peak',
    priceMinor: 320000,
    currency: 'NGN',
    imageUrl: null,
    departmentSlug: 'supermarket',
    categorySlug: 'dairy',
    packSize: '1 litre',
    purchaseState: 'purchasable',
  },
  {
    id: 'prod_rice',
    slug: 'long-grain-rice-5kg',
    name: 'Long Grain Rice',
    brand: 'Golden Harvest',
    priceMinor: 685000,
    currency: 'NGN',
    imageUrl: null,
    departmentSlug: 'supermarket',
    categorySlug: 'groceries',
    packSize: '5 kg bag',
    purchaseState: 'purchasable',
  },
  {
    id: 'prod_retired',
    slug: 'discontinued-syrup',
    name: 'Cough Syrup',
    brand: 'Daywell',
    priceMinor: 90000,
    currency: 'NGN',
    imageUrl: null,
    departmentSlug: 'pharmacy',
    categorySlug: 'cough-cold',
    packSize: '100 ml',
    purchaseState: 'inactive',
  },
] as const;

export const categoriesResponse = {
  data: {
    categories: [
      { id: 'cat_pain', slug: 'pain-relief', name: 'Pain Relief', departmentId: 'dept_pharmacy' },
      {
        id: 'cat_cough',
        slug: 'cough-cold',
        name: 'Cough & Cold',
        departmentId: 'dept_pharmacy',
      },
      {
        id: 'cat_vitamins',
        slug: 'vitamins-supplements',
        name: 'Vitamins',
        departmentId: 'dept_pharmacy',
      },
      { id: 'cat_dairy', slug: 'dairy', name: 'Dairy', departmentId: 'dept_supermarket' },
      {
        id: 'cat_groceries',
        slug: 'groceries',
        name: 'Groceries',
        departmentId: 'dept_supermarket',
      },
    ],
  },
};

/**
 * Detail payloads (PRD 4.1 `GET /catalog/products/{slug}`, MFR-4).
 *
 * Only the pharmacy items carry the `pharmacy` block, so the detail screen's
 * conditional rendering is exercised both ways.
 */
const productDetails: Record<string, unknown> = {
  'paracetamol-500mg-20-tabs': {
    ...products[0],
    description:
      'Paracetamol 500mg tablets for everyday pain relief such as headache, toothache and mild fever. Adults and children over 12.',
    stockQuantity: 42,
    pharmacy: {
      dosageForm: 'Tablet',
      strength: '500mg',
      nafdacNumber: 'NAFDAC-12345',
      requiresPrescription: false,
    },
  },
  'ibuprofen-400mg-12-tabs': {
    ...products[1],
    description: 'Ibuprofen 400mg tablets. Prescription item; dispensed by a pharmacist only.',
    stockQuantity: 8,
    pharmacy: {
      dosageForm: 'Tablet',
      strength: '400mg',
      nafdacNumber: 'NAFDAC-22345',
      requiresPrescription: true,
    },
  },
  'whole-milk-1l': {
    ...products[3],
    description: 'Fresh whole milk, pasteurised and homogenised. Keep refrigerated.',
    stockQuantity: 25,
  },
};

/** Exported so the mock transport can serve a page for any fixture product. */
export const productsResponse = {
  data: {
    products: products.map((product) => ({ ...product })),
    nextCursor: null,
  },
};

/** Detail lookup used by {@link createMockFetch}. */
export function findProductFixture(slug: string): unknown | undefined {
  const detail = productDetails[slug];
  if (detail) return { data: detail };

  // Any other fixture product resolves without the optional detail fields, so
  // a link from the list never 404s against the mock.
  const summary = products.find((product) => product.slug === slug);
  return summary ? { data: { ...summary } } : undefined;
}

/** Demonstrates the error envelope the app must render distinctly. */
export const errorResponse = {
  error: {
    code: 'PRODUCT_UNAVAILABLE',
    message: 'This product is not available right now.',
    fieldErrors: {},
  },
};
