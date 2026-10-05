# API contract notes

Every gap between the mobile app's assumptions and the deployed backend.
Recorded here per AGENTS.md §9 so nothing is discovered for the first time on a
device. Append-only; do not rewrite history — add a dated entry.

## 2026-10-04 — M3 catalog contract assumptions

M3 was built against the mock layer because Tier 1 is not deployed. These are
the query-parameter and field names the app **assumes**, which the backend must
either match or correct. Each is a guess the PRD does not pin, so it is listed
explicitly rather than buried in code.

### Query parameters assumed for `GET /catalog/products`

| Param | Assumed | Purpose |
| --- | --- | --- |
| `department` | department **slug** | MFR-2 department filter |
| `category` | category **slug** | MFR-2 category filter |
| `q` | raw search term | MFR-3, matched by the server over name **and** brand |
| `limit` | integer page size (app sends 20) | PRD 13 requires every list to paginate |
| `page` | 1-based page number (app sends 1, then 2, 3…) | pagination position |

**Resolved 2026-10-04 (backend decision).** Pagination is **page-number**, not
cursor. The response envelope is pinned as:

```json
{ "items": [...], "page": 1, "limit": 20, "totalItems": 42, "totalPages": 3 }
```

The app sends `?page=` and `?limit=20`, and requests the next page only while
`page < totalPages`. The earlier `?cursor=` / `nextCursor` assumption was wrong
and has been removed from the schema, the query layer, and the mocks. A test now
asserts the old cursor envelope is **rejected**, so a stale contract cannot pass
silently.

**Unconfirmed:** whether `department`/`category` are slugs or ids, and the exact
`items[]` field names. If they differ, only `fetchProductsPage` and the schemas
in `src/features/catalog/` need to change.

### Response shapes

1. **Pagination envelope.** Pinned as above (page-number). A bare array is still
   accepted as a fallback and reports `totalPages: 1`, so an unpaginated response
   degrades to a single page instead of breaking the list.
2. **`purchaseState` as a discrete enum.** Confirmed as server-owned: one of
   `purchasable | prescription_only | out_of_stock | inactive`. The app **refuses
   to guess** — it will not derive purchasability from `stock` or
   `requiresPrescription`, because that is a business decision the server owns
   (AGENTS.md 3.2). The backend must compute and send the state.
3. **Money.** `priceMinor` as an integer (kobo) plus `currency`, per PRD 7.1. The
   schema rejects a fractional price outright rather than rounding it.
4. **Pharmacy fields.** Optional `pharmacy: { dosageForm, strength, nafdacNumber,
   requiresPrescription }` (MFR-4). Everything renders only when present, so a
   supermarket product needs none of it.

### Open gaps carried into M3

- Add to cart is intentionally inert: it needs auth (M4) and the cart mutation
  (M5). The button states the server's truth and explains when it is disabled,
  so the screen does not fake a successful add.
- `GET /catalog/categories` is assumed to accept `?department=` to scope the
  filter chips. If it does not, categories must be filtered on the client,
  which is acceptable because they are public reference data rather than
  anything the server decides for us.

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
## 2026-10-05 - M5 cart API source contract

Inspected the handlers and presenter in the web repository (`src/app/api/v1/cart/**` and `src/server/api/presenters.ts`). Per owner confirmation, production `GET /api/v1/cart` returns 401 without a bearer token. The handlers authenticate via `requireApiUser()` and pass the resolved local user id to the existing cart feature, which looks up the same `carts.userId` row used by the website.

All four routes exist: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{productId}` and `DELETE /cart/items/{productId}`. Every success returns the full cart at `data.cart`, with `{ items, totalQuantity, subtotalMinor, currency }`. Each item has `productId`, `slug`, `name`, `brand`, `imageUrl`, `department`, `unitPriceMinor`, `quantity`, `lineTotalMinor`, `stock`, `maxPerOrder`, `requiresPrescription`, and `isActive`. Prices and totals are integer kobo; currency is `NGN`.

POST accepts `{ productId, quantity }`, PATCH accepts `{ quantity }`, DELETE accepts no body. Stock and max-per-order are enforced on the server, with structured cart error codes. No cart mock is used by the M5 feature. ETag support was not found on the GET handler, so polling sends no conditional header.

M5 additionally uses Expo SDK 57 `expo-network` to detect the offline-to-online transition and refetch the cart query while foregrounded. The matching native module was added with `npx expo install expo-network`.
