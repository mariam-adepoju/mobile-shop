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
