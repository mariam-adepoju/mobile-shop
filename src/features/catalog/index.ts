/**
 * Catalog feature (AGENTS.md 5).
 *
 * Domain logic, schemas and queries only. Other features import this module
 * through `index.ts` and never reach into its files.
 */
export {
  DepartmentListSchema,
  DepartmentSchema,
  type Department,
  type DepartmentList,
} from './schemas';
export { departmentsKey, departmentsQueryOptions, fetchDepartments } from './queries';
