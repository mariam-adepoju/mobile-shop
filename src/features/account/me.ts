import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { getApiClient } from '@/lib/api';

/**
 * The caller's profile as the **backend** sees it (PRD 4.1 `GET /me`, MFR-9).
 *
 * This is deliberately not read from the Auth0 token. MFR-9 requires proving
 * that mobile login resolves to the same local user row as web login, and only
 * the backend can answer that: `requireApiUser()` maps the token's `sub` to a
 * `users` row. If the app decoded the ID token instead, it would be trusting its
 * own claim rather than the shared identity the grading depends on.
 *
 * Display name and email are PII, so nothing here is persisted or logged
 * (AGENTS.md 3.9).
 */
export const MeSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().nullish(),
  auth0Sub: z.string().min(1).optional(),
});

export type Me = z.infer<typeof MeSchema>;

/** What `GET /api/v1/me` actually returns inside `data` (see the backend route). */
const MeResponseSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    fullName: z.string().nullish(),
    email: z.string().min(1),
    emailVerified: z.boolean().optional(),
    phone: z.string().nullish(),
    avatarUrl: z.string().nullish(),
  }),
});

/** The single query key for the current user's profile. */
export const meKey = ['me'] as const;

/**
 * `GET /me` with the **access token** (AGENTS.md 3.4).
 *
 * `auth: true` makes the client attach the bearer and run its single-flight
 * refresh with one retry on 401, so an expired access token is transparent.
 */
export function fetchMe(signal?: AbortSignal): Promise<Me> {
  return getApiClient()
    .get('/me', MeResponseSchema, { auth: true, signal })
    .then(({ data }) => {
      const { user } = data;
      const name = user.fullName && user.fullName.length > 0 ? user.fullName : user.email;
      return { id: user.id, email: user.email, name, phone: user.phone ?? null };
    });
}

export function meQueryOptions() {
  return queryOptions({
    queryKey: meKey,
    queryFn: ({ signal }) => fetchMe(signal),
    // A profile does not change on its own; it is refetched on sign-in, on
    // focus, and after an edit.
    staleTime: 60_000,
  });
}
