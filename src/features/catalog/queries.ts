import { queryOptions } from '@tanstack/react-query';

import { getApiClient } from '@/lib/api';

import { DepartmentListSchema, type Department } from './schemas';

/**
 * Query key for the department list (PRD 6.3: the cart has one key; so does
 * every other server collection).
 */
export const departmentsKey = ['catalog', 'departments'] as const;

/**
 * `GET /catalog/departments` (PRD 4.1).
 *
 * Public, so no token is attached and no sign-in gate applies (PRD 2).
 */
export function fetchDepartments(signal?: AbortSignal): Promise<Department[]> {
  return getApiClient()
    .get('/catalog/departments', DepartmentListSchema, { signal })
    .then((response) => response.data.departments);
}

export function departmentsQueryOptions() {
  return queryOptions({
    queryKey: departmentsKey,
    queryFn: ({ signal }) => fetchDepartments(signal),
  });
}

export type { Department };
