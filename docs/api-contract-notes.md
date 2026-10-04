# API contract notes

Every gap between the mobile app's assumptions and the deployed backend.
Recorded here per AGENTS.md §9 so nothing is discovered for the first time on a
device. Append-only; do not rewrite history — add a dated entry.

## 2026-10-04 — M2 baseline probe

Live probe of `https://daywell-shop.vercel.app` (acceptance runs against `live`
per AGENTS.md §9):

| Path | Result |
| --- | --- |
| `GET /api/v1/health` | **404 Not Found** |
| `GET /api/v1/catalog/departments` | **404 Not Found** |
| `GET /api/health` | `200` — `{"status":"ok","service":"shop-website","timestamp":"..."}` |

**Conclusion: the Tier 1 `/api/v1` slice is not deployed.** Only the website's own
`/api/health` exists. The graded core (same account, cart sync) therefore cannot
be exercised against `live` yet, and M2 onward is developed in
`EXPO_PUBLIC_API_MODE=mock`.

### Open gaps

1. **No `/api/v1` router at all.** Needed before M3 can use a live catalog and
   long before M4/M5. Requires backend work in the web repo: `requireApiUser`,
   proxy bypass, health, catalog, `/me`, cart.
2. **`GET /catalog/departments` response shape is unpinned.** The PRD does not
   fix whether `data` is a bare array or `{ departments: [...] }`. The client
   currently accepts **both** and normalises to one internal shape
   (`src/features/catalog/schemas.ts`). Once M1 ships, this must collapse to
   whichever form the backend actually returns — the union is a temporary hedge,
   not a decision.
3. **Auth0 tenant values are unknown.** `EXPO_PUBLIC_AUTH0_DOMAIN`,
   `..._CLIENT_ID` and `..._AUDIENCE` are all unset, so `config.auth0.configured`
   is `false` and `assertAuth0Configured()` will throw. M4 cannot start until
   these are supplied. They are public identifiers, not secrets.
4. **Bundle identifiers are now final: `com.marrizon.daywell`** for both
   `ios.bundleIdentifier` and `android.package` (set 2026-10-04). The Auth0
   native application must be registered against this exact identifier together
   with the scheme `daywell://`.

### Assumptions recorded

- Base URL for `live` mode is `https://daywell-shop.vercel.app/api/v1`
  (`.env.example`). All `/api/v1` paths are appended relative to it.
- The mock layer in `src/mocks/` is **removable**: once Tier 1 is live, delete
  `src/mocks` and the `mock` branch of `createApiClient` in `src/lib/api/instance.ts`.
  Fixtures are raw wire payloads and pass through the real envelope + Zod
  validation, so mock mode does not bypass the client.