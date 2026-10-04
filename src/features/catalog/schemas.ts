import { z } from 'zod';

/**
 * Catalog response schemas (AGENTS.md 5, "Validation").
 *
 * Types are derived from these with `z.infer`, so the runtime contract and the
 * static types cannot drift. Every shape is deliberately permissive about
 * fields the app does not yet use, so an additive backend change does not
 * break the client, but strict about the fields it does use.
 */

/** A top-level department, e.g. "Pharmacy" or "Supermarket". */
export const DepartmentSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
  imageUrl: z.string().nullish(),
  /** Server-ordered; the client must not re-sort against server intent. */
  sortOrder: z.number().int().nullish(),
});

export type Department = z.infer<typeof DepartmentSchema>;

/**
 * `GET /catalog/departments` -> `data` (PRD 4.1).
 *
 * The exact envelope for this endpoint is not yet pinned down by the backend
 * (see docs/api-contract-notes.md), so the schema accepts either a bare array
 * or a `{ departments: [...] }` wrapper and normalises to one internal shape.
 * Once M1 ships, this should collapse to whichever form the backend uses.
 */
export const DepartmentListSchema = z
  .union([z.object({ departments: z.array(DepartmentSchema) }), z.array(DepartmentSchema)])
  .transform((value) => ({ departments: Array.isArray(value) ? value : value.departments }));

export type DepartmentList = z.infer<typeof DepartmentListSchema>;

/**
 * A category within a department, e.g. "Pain Relief" inside Pharmacy.
 *
 * MFR-2 requires filtering by category, so the filter chip uses `slug`.
 */
export const CategorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  /** Null when the category spans all departments. */
  departmentId: z.string().nullish(),
  imageUrl: z.string().nullish(),
});

export type Category = z.infer<typeof CategorySchema>;

/** `GET /catalog/categories`, optionally scoped by `?department=`. */
export const CategoryListSchema = z
  .union([z.object({ categories: z.array(CategorySchema) }), z.array(CategorySchema)])
  .transform((value) => ({ categories: Array.isArray(value) ? value : value.categories }));

export type CategoryList = z.infer<typeof CategoryListSchema>;

/**
 * Server-owned purchase state (MFR-5, PRD 9.1).
 *
 * These are the server's answers, not the app's judgement: the client never
 * infers purchasability from stock counts or dates (AGENTS.md 3.2).
 */
export const PurchaseStateSchema = z.enum([
  /** Buyable now. */
  'purchasable',
  /** Needs a valid prescription, which the web flow does not collect. */
  'prescription_only',
  /** Listed but not currently buyable. */
  'out_of_stock',
  /** Withdrawn from sale by the backend. */
  'inactive',
]);

export type PurchaseState = z.infer<typeof PurchaseStateSchema>;

/** Only this state may be added to a cart (MFR-5). */
export const isPurchasable = (state: PurchaseState): boolean => state === 'purchasable';

/**
 * Pharmacy-specific attributes (MFR-4).
 *
 * All optional: a supermarket product has none of these, and a pharmacy product
 * may legitimately omit NAFDAC details. Rendered only when present.
 */
export const PharmacyAttributesSchema = z.object({
  dosageForm: z.string().nullish(),
  strength: z.string().nullish(),
  nafdacNumber: z.string().nullish(),
  /** True for prescription items; mirrors `prescription_only` when absent. */
  requiresPrescription: z.boolean().nullish(),
});

export type PharmacyAttributes = z.infer<typeof PharmacyAttributesSchema>;

/**
 * A product as it appears in a list (PRD 4.1 `GET /catalog/products`).
 *
 * `priceMinor` is integer kobo straight from the server. The app formats it for
 * display and never computes it (AGENTS.md 5, MFR-16).
 */
export const ProductSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().nullish(),
  /** Integer kobo. `150000` is ₦1,500.00. */
  priceMinor: z.number().int(),
  currency: z.string().min(3).default('NGN'),
  imageUrl: z.string().nullish(),
  departmentSlug: z.string().nullish(),
  categorySlug: z.string().nullish(),
  packSize: z.string().nullish(),
  purchaseState: PurchaseStateSchema,
});

export type ProductSummary = z.infer<typeof ProductSummarySchema>;

/**
 * Full product detail (PRD 4.1 `GET /catalog/products/{slug}`, MFR-4).
 *
 * A superset of the summary: the list view is just the detail minus the long
 * copy, which keeps one source of truth for pricing and purchase state.
 */
export const ProductDetailSchema = ProductSummarySchema.extend({
  description: z.string().nullish(),
  /** Remaining units as the server counts them; never used for a decision. */
  stockQuantity: z.number().int().nullish(),
  pharmacy: PharmacyAttributesSchema.nullish(),
});

export type ProductDetail = z.infer<typeof ProductDetailSchema>;

/** Default page size. PRD 13 requires every list to paginate. */
export const PRODUCTS_PAGE_SIZE = 20;

/**
 * `GET /catalog/products` -> `data`.
 *
 * The pagination envelope is not pinned by the backend yet (see
 * docs/api-contract-notes.md), so both a cursor page and a bare array are
 * accepted and normalised to `{ products, nextCursor }`.
 *
 * `nextCursor` is passed back verbatim as `?cursor=`. When the backend has no
 * cursor to give, a full page implies more may exist and a short page ends the
 * list; the app never assumes a total count.
 */
export const ProductPageSchema = z
  .union([
    z.object({
      products: z.array(ProductSummarySchema),
      nextCursor: z.string().nullish(),
    }),
    z.array(ProductSummarySchema),
  ])
  .transform((value) => {
    if (Array.isArray(value)) {
      // No cursor available: a full page is the only pagination signal there is.
      const nextCursor = value.length === PRODUCTS_PAGE_SIZE ? 'offset' : null;
      return { products: value, nextCursor };
    }
    return { products: value.products, nextCursor: value.nextCursor ?? null };
  });

export type ProductPage = z.infer<typeof ProductPageSchema>;

/**
 * Filters for `GET /catalog/products` (MFR-2, MFR-3).
 *
 * `search` covers name and brand; the backend owns the matching rules, so the
 * app sends the raw term and never filters locally.
 */
export interface ProductFilters {
  readonly departmentSlug?: string;
  readonly categorySlug?: string;
  readonly search?: string;
}

/** True when nothing narrows the list. */
export function isUnfiltered(filters: ProductFilters): boolean {
  return (
    (filters.departmentSlug ?? '') === '' &&
    (filters.categorySlug ?? '') === '' &&
    (filters.search ?? '').trim() === ''
  );
}
