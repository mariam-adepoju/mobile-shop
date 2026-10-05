# PRD: Daywell Mobile App

**HNG15 | Lesson 3 | Individual Task: Build a Mobile App for Your Shop**

| Field                | Value                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Status**           | Draft v1: implementation-ready                                                         |
| **Owner**            | `<your name>`                                                                          |
| **Deadline**         | Monday, 5 October 2026, 11:59 PM WAT                                                   |
| **Type**             | Individual task                                                                        |
| **Platform**         | iOS and Android (React Native via Expo; see §3)                                        |
| **Backend**          | The existing Daywell Next.js 16 app + the same Neon Postgres (no second backend)       |
| **Production host**  | `https://daywell-shop.vercel.app`                                                      |
| **Upstream specs**   | Web `PRD.md` (§1–33), web `DESIGN.md`, `docs/mobile-app-backend-integration.md`        |

> **Precedence.** Where this document conflicts with the web `PRD.md` on business rules,
> the web `PRD.md` wins. Where it conflicts with `DESIGN.md` on anything visual,
> `DESIGN.md` wins. This document owns everything specific to the mobile client.

---

## 0. Task Brief Coverage

Taken directly from the Lesson 3 announcement. Checkmarks mean the requirement is
*explicitly covered by this PRD*, not that it is already built.

- [x] **Create a mobile app for the existing shop website using the same API endpoints.** (§1, §5, §7)
- [x] **Users can log in to both the website and the mobile app using the same account.** (§8)
- [x] **An item added to the cart on the website must instantly appear in the cart on the mobile app.** (§6)
- [x] **Test the mobile app on a physical phone to confirm login and cart synchronisation work correctly.** (§14.4, §17)

### Implementation status

- [ ] Backend `/api/v1` endpoints deployed (**prerequisite, see §4**)
- [ ] Auth0 Native application + API audience configured
- [ ] Mobile app: browse, sign in, cart implemented
- [ ] Cart sync verified web → mobile and mobile → web
- [ ] Tested on a physical phone (evidence recorded)
- [ ] Checkout + Paystack test payment working on device
- [ ] Demo video + README submitted

### Priority ladder for the deadline

The brief's **graded core** is: *same-account login* and *cart sync*, proven on a
*physical phone*. Everything else is secondary. Ship in this order and do not start
a later tier while an earlier one is broken:

1. **Tier 1 (graded core):** catalog browse, Google login via Auth0, cart read/mutate, web↔mobile sync, physical-device proof.
2. **Tier 2 (completes the product):** addresses, checkout, Paystack, order history/detail.
3. **Tier 3 (polish):** profile edit, retries, skeleton states, accessibility pass.

---

## 1. Overview

Daywell Mobile is a native iOS/Android shopping client for the Daywell pharmacy and
supermarket demo store. It is a **second client of the existing product**, not a
second product. It consumes the same catalog, authenticates the same Auth0 + Google
users, and reads/writes the same server-persisted cart, address book, and orders.

The Next.js application remains the single trusted backend for identity resolution,
product availability, prices, stock, delivery fee, totals, order state, payment
verification, and confirmation email. The app displays server state and submits user
intent; it never decides money, stock, or payment outcomes.

### 1.1 Goals

- One account across web and mobile (same local `users` row via Auth0 `sub`).
- One cart, one address book, one order history, shared between clients.
- A cart change on either client is visible on the other with minimal, measurable delay (§6).
- Full journey: browse → sign in → cart → delivery details → Paystack test payment → server verification → paid order → confirmation email.
- Production-quality: typed, validated, secure token storage, accessible, tested, observable.
- Visually the same product as the web shop (follow `DESIGN.md`).

### 1.2 Non-goals (first release)

- A second backend, database, identity system, or payment processor.
- Direct mobile access to Neon, Paystack secrets, or Mailgun.
- Prescription upload/fulfilment, admin tools, delivery tracking, coupons, loyalty, reviews, wishlists, push notifications.
- Card entry inside the app (payment happens in Paystack's hosted page).
- Offline order placement or offline cart writes.
- Guest-cart merge (P2, deferred).
- Redesigning the web application.

### 1.3 Non-negotiable constraints

1. One backend, one database, one identity source.
2. The server is the source of truth for prices, stock, limits, delivery fee, totals, order state, payment state.
3. No provider secret, database credential, or Auth0 client secret exists in the app bundle or its env file.
4. The app never infers "paid" from a deep link, query string, or browser redirect.
5. The ID token is never used as an API credential; only the access token is.

---

## 2. Users and Primary Journey

| Persona              | Needs                                                                     |
| -------------------- | ------------------------------------------------------------------------- |
| Shopper              | Browse, search, filter, add to cart on a phone                            |
| Returning customer   | Same Google account as web; sees existing cart, addresses, orders         |
| Gift buyer           | Deliver to another recipient/address                                      |
| Reviewer/instructor  | Install the app, log in, add on web → see it on the phone, verify payment |

Primary journey (maps to web PRD §26):

1. Browse departments/categories/products/details signed out.
2. Tap a protected action (cart, checkout, orders, account) → Google sign-in via Auth0 → action resumes.
3. Add products to the server-persisted cart.
4. Choose a saved address or a different recipient.
5. Review server-calculated subtotal, delivery fee, total.
6. Create order → open Paystack hosted checkout.
7. Return to the app → app reads **verified** order state from the API.
8. See confirmation and order history. Backend sends the existing Mailgun email.

---

## 3. Technical Decisions (resolves backend doc §13)

These are decided here so implementation is not blocked. Each can be revised only via an ADR in `docs/adr/`.

| #  | Decision            | Choice                                                                                                                                  | Rationale                                                                                              |
| -- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| D1 | Framework           | **Expo (latest stable SDK) + React Native + TypeScript strict**, **Expo Router**                                                         | Fastest path to a real-device build for both OSes; same language/Zod schemas as backend; team-familiar |
| D2 | Build type          | **Development build / EAS build**, not Expo Go                                                                                           | The native Auth0 SDK needs native code; Expo Go cannot run it                                           |
| D3 | Auth                | **`react-native-auth0`** (Auth Code + PKCE, system browser) with its Expo config plugin                                                  | Official SDK; handles PKCE, secure credential storage, refresh                                          |
| D4 | Server state        | **TanStack Query**                                                                                                                      | Cache, refetch-on-focus, polling, invalidation; ideal for cart sync                                     |
| D5 | Client/UI state     | React state + small context (auth session, toast); no global store unless a concrete need appears                                       | Simplicity (matches web AGENTS.md)                                                                      |
| D6 | Validation          | **Zod** schemas for every API response and every form                                                                                   | Contract drift is caught at the boundary, not as a crash in a screen                                    |
| D7 | Forms               | `react-hook-form` + `@hookform/resolvers/zod`                                                                                           | Accessible, typed validation                                                                            |
| D8 | Secure storage      | Auth0 SDK credentials manager (Keychain / Keystore); `expo-secure-store` for anything else sensitive                                     | Spec §7.3                                                                                               |
| D9 | Payment browser     | `expo-web-browser` `openAuthSessionAsync`                                                                                               | System browser session that returns control to the app on the redirect URL                              |
| D10| Min OS versions     | The minimums supported by the chosen Expo SDK (verify in its release notes at project setup and record in README)                       | Avoids hand-picking unsupported versions                                                                |
| D11| Guest cart merge    | **Deferred (P2)**; not in first release                                                                                                 | Cart is account-bound; anonymous browsing only                                                          |
| D12| Package manager     | Match the web repo (`npm` unless the web repo says otherwise)                                                                           | One toolchain                                                                                           |

> **Verify before coding.** Expo, Expo Router, and `react-native-auth0` change often.
> Read the installed version's docs (`node_modules/<pkg>/` README/changelog, or the
> official docs for the pinned version) before writing integration code. Do not rely
> on memory of older APIs.

---

## 4. Backend Dependency (Critical Path)

**The `/api/v1` endpoints do not exist yet** in the web repo (see backend doc §2.2). The
mobile app cannot be validated end-to-end until they are implemented and deployed.
This is not optional scope; it is a prerequisite and the largest schedule risk.

### 4.1 Minimum backend slice for the graded core (do this first)

| Endpoint                          | Needed for                |
| --------------------------------- | ------------------------- |
| `GET /api/v1/health`              | Connectivity smoke test   |
| `GET /api/v1/catalog/departments` | Browse                    |
| `GET /api/v1/catalog/categories`  | Browse/filter             |
| `GET /api/v1/catalog/products`    | Browse/search             |
| `GET /api/v1/catalog/products/{slug}` | Product detail        |
| `GET /api/v1/me`                  | Same-account proof        |
| `GET /api/v1/cart`                | Cart sync                 |
| `POST /api/v1/cart/items`         | Add to cart               |
| `PATCH /api/v1/cart/items/{productId}` | Change quantity      |
| `DELETE /api/v1/cart/items/{productId}` | Remove line         |

Plus the infrastructure these require: `requireApiUser()` bearer verification with
`jose`, `AUTH0_API_AUDIENCE` env group, `/api/v1` bypass in `src/proxy.ts`,
`src/server/api/{responses,validation}.ts`. Follow backend doc §5 exactly.

### 4.2 Tier 2 backend slice

Addresses CRUD + default, `POST /orders` (with `Idempotency-Key`), `GET /orders`,
`GET /orders/{id}`, `POST /orders/{id}/payment-attempts`, `POST /payments/verify`,
`PATCH /me`, and a **session-less mobile Paystack callback**.

### 4.3 Contract gaps this PRD identifies (resolve with the backend owner)

These are not fully specified upstream and will block or break the mobile flow if ignored:

1. **Mobile Paystack callback target.** `initializePaymentForOrder()` hard-codes `callback_url` to `/checkout/callback` (web, cookie-session). For orders created through `/api/v1`, the callback URL must point to a **session-less** backend route (e.g. `/api/v1/payments/callback`) that verifies via `verifyPaymentReference(reference)` and then redirects to the app link. The `POST /orders` and `payment-attempts` handlers must therefore pass an explicit callback to payment initialization (an optional argument defaulting to today's value). **Web behaviour must not change.**
2. **Redirect target for dev builds.** Universal/app links need a Daywell-owned domain with association files. For the deadline, the callback redirects to the custom scheme `daywell://payment-return?reference=…`, which `openAuthSessionAsync` captures. HTTPS universal links are a hardening follow-up (§7.4).
3. **Cart response shape.** `GET /cart` and all cart mutations must return the **same full cart object** (lines, `itemCount`, `subtotalMinor`, `currency`) so the client can replace cache state directly with the response.
4. **Cart sync freshness.** Add `ETag`/`If-None-Match` (or a `cartVersion`/`updatedAt` field, since `carts.updated_at` already exists) on `GET /cart` to make frequent polling cheap. P1; the app works without it.
5. **Error codes.** The API must return the machine-readable `error.code` values listed in backend doc §5.4 (`OUT_OF_STOCK`, `MAX_QUANTITY_EXCEEDED`, `PRESCRIPTION_ONLY`, `PAYMENT_IN_PROGRESS`, …) so the app can render distinct states.
6. **Rate limiting.** If polling is aggressive, it must not trip the limiter. Read endpoints (`GET /cart`, `GET /orders/*`) are exempt or given a high limit; mutations/payment keep strict limits.

### 4.4 Parallel-work rule

Until Tier 1 endpoints are deployed, the app is developed against a **typed mock API
layer** (fixtures that match the Zod response schemas, toggled by
`EXPO_PUBLIC_API_MODE=mock|live`). The mock is for UI development only and must be
removable; **graded verification is always against `live`.**

---

## 5. Functional Requirements

Priority: **P0** mandatory for first release, **P1** important, **P2** optional.
IDs match the backend/web mobile PRD (MFR-1…31) so traceability is preserved. Items
marked ★ are the graded core.

### 5.1 Catalog

| ID    | Requirement                                                                                                           | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| MFR-1 | Present Pharmacy and Supermarket departments from active backend catalog data.                                         | P0       |
| MFR-2 | List products; filter by department and category.                                                                       | P0       |
| MFR-3 | Search by name and brand; paginate results (infinite scroll or "load more").                                            | P0       |
| MFR-4 | Product detail: description, image, brand, price, pack size, stock state, pharmacy fields (dosage form, strength, NAFDAC no., OTC/Rx status) when present. | P0 |
| MFR-5 | Prescription-only, inactive, out-of-stock items cannot be purchased; UI explains the state the backend returns.        | P0       |
| MFR-6 | "Demo store: not a licensed pharmacy" notice visible in app chrome (e.g. home footer/about) **and** at checkout.       | P0       |

### 5.2 Authentication and account

| ID     | Requirement                                                                                                  | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------ | -------- |
| MFR-7 ★ | Sign in with Google via Auth0 native Authorization Code + PKCE in the system browser.                        | P0       |
| MFR-8 ★ | Request and send an Auth0 **access token** for the Daywell API; never send the ID token.                     | P0       |
| MFR-9 ★ | Mobile login resolves to the **same** local user row as web login (verified by comparing `GET /me` on both). | P0       |
| MFR-10 | View and edit name and phone.                                                                                | P1       |
| MFR-11 | Sign out clears local credentials and Auth0 session; expired sessions refresh once or force sign-in.         | P0       |
| MFR-12 | Missing/invalid/expired/insufficient-scope credentials yield distinct, clear states; no protected data shown. | P0       |

### 5.3 Cart

| ID      | Requirement                                                                                                        | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| MFR-13 ★ | View the persistent cart shared with the web app.                                                                  | P0       |
| MFR-14 ★ | Add products, change quantities, remove lines.                                                                     | P0       |
| MFR-15  | Backend validates active status, purchasability, stock, max-per-order on every mutation; app surfaces the error code. | P0     |
| MFR-16  | Render server prices and totals only; ignore any locally computed money.                                           | P0       |
| MFR-17  | Guest cart merge.                                                                                                  | P2 (deferred) |
| **MFR-32 ★** | **A cart change made on the website appears in the mobile cart without manual app restart, per the sync rules in §6.** | **P0** |
| **MFR-33 ★** | **A cart change made in the app is visible on the website on its next load/refresh.**                              | **P0**   |

### 5.4 Addresses and checkout

| ID     | Requirement                                                                                          | Priority |
| ------ | ---------------------------------------------------------------------------------------------------- | -------- |
| MFR-18 | List, create, edit, delete addresses; choose a default.                                              | P0       |
| MFR-19 | Exactly one default address when addresses exist.                                                    | P0       |
| MFR-20 | Phone accepts `+234XXXXXXXXXX` / `0XXXXXXXXXX` (client hint only; backend normalises to E.164).      | P0       |
| MFR-21 | Checkout supports saved address or different recipient/address with all required Nigerian fields (recipient name, phone, line 1, optional line 2/landmark, city, Nigerian state, optional notes). | P0 |
| MFR-22 | Server creates order and reserves stock atomically; app sends **no** prices/fees/totals.             | P0       |
| MFR-23 | Each checkout attempt generates a UUID `Idempotency-Key`, persisted until the attempt resolves, reused on retry. | P0   |
| MFR-24 | If order creation succeeds but payment initialization fails, the order is shown as payable-again.    | P0       |

### 5.5 Payment and orders

| ID     | Requirement                                                                                                             | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| MFR-25 | Open the backend-returned `authorizationUrl` in a system/secure browser session.                                        | P0       |
| MFR-26 | Return URL/deep link is a navigation signal only; "Paid" shown only after `POST /payments/verify` or `GET /orders/{id}` reports verified paid. | P0 |
| MFR-27 | (Backend) verifies amount, NGN, reference, status, order. App handles all outcomes.                                     | P0       |
| MFR-28 | (Backend) webhook remains backup; app must tolerate order becoming `paid` without a callback (poll on order screen).     | P0       |
| MFR-29 | List/open only own orders and order details.                                                                            | P0       |
| MFR-30 | Retry payment for an unpaid, unexpired order via `POST /orders/{id}/payment-attempts`; no duplicate order.              | P0       |
| MFR-31 | (Backend) confirmation email sent once; app does not send email.                                                        | P0       |

---

## 6. Cart Synchronisation (Graded Core)

The brief says a website cart add must "instantly appear" on mobile. A mobile app
cannot be pushed web changes without a realtime channel, so "instant" is defined here
as a **measurable, tested** freshness guarantee using the existing request/response API.

### 6.1 Sync contract

| Trigger                                              | Behaviour                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| App returns to foreground (`AppState` → `active`)    | Immediately refetch cart and cart badge (bypass staleness)           |
| Cart screen focused / mounted                        | Immediate refetch                                                    |
| Cart screen visible and app active                   | **Poll `GET /cart` every 3–5 s** (configurable constant)             |
| Any tab visible (badge)                              | Refetch badge on focus and every ~15 s while app is active           |
| After any mobile cart mutation                       | Replace cache with the mutation response; then invalidate to reconcile |
| Pull-to-refresh on cart                              | Manual refetch                                                       |
| App backgrounded                                     | **Stop polling** (battery/data/rate limits)                          |
| Network lost → regained                              | Refetch automatically                                                |

### 6.2 Acceptance targets

- Web add → mobile cart screen already open: line appears within **≤ 5 s**, no user action.
- Web add → mobile app in background, then foregrounded: cart correct within **≤ 2 s** of foreground (one request).
- Mobile add → web: appears on web after reload/navigation (web is server-rendered; no live push expected, but data is already persisted).
- Quantity changes and removals sync the same way in both directions.
- Two devices/clients mutating concurrently converge to server state after the next fetch (last-write-wins by server; UI always reconciles to server response).

### 6.3 Implementation rules

- Cart is a single TanStack Query key (`["cart"]`). The cart tab badge derives from it (no separate source of truth).
- Polling uses `refetchInterval` toggled by screen focus + `AppState`; use `ETag`/`If-None-Match` when the backend supports it (§4.3-4) so unchanged polls are `304`.
- Optimistic UI is allowed **only** for quantity steppers, and must roll back and reconcile on any error or on the server response. Never optimistically render a price or total.
- A visible, subtle "Updated just now" / pull-to-refresh affordance; a non-blocking error banner if polling fails (do not wipe the cart on a failed poll).
- Optional P2 upgrade (only if time remains and backend agrees): Server-Sent Events or push-triggered invalidation. Do **not** build this before Tier 1 is verified on a device.

---

## 7. API Integration

### 7.1 Base URL and conventions

- `EXPO_PUBLIC_API_BASE_URL=https://daywell-shop.vercel.app/api/v1` (non-secret; per-environment via EAS profiles; never hard-coded in source).
- JSON only. Money = integer minor units (kobo), currency `NGN`. Dates = ISO 8601 UTC.
- Success envelope `{ "data": … }`; error envelope `{ "error": { "code", "message", "fieldErrors" } }`.
- Backend status contract: `200, 400, 401, 403, 404, 409, 413, 429 (+Retry-After), 5xx`.

### 7.2 Typed API client (single module)

One client in `src/lib/api/` is the **only** code that calls `fetch`. It must:

1. Attach `Authorization: Bearer <access token>` on protected routes (token obtained from the Auth0 credentials manager at call time, never cached in app state/logs).
2. Set JSON headers; apply a **timeout** (e.g. 15 s, `AbortController`).
3. Parse the envelope and **validate `data` with the endpoint's Zod schema**; schema mismatch → typed `ContractError` (logged without payload), user sees a generic recoverable error.
4. On `401`: **single-flight** token refresh (one in-flight refresh shared by concurrent requests) → retry the request **once** → if still `401`, emit `session-expired` and route to sign-in.
5. Map `error.code` to a typed `ApiError` (`code`, `status`, `message`, `fieldErrors`, `retryAfter`).
6. Auto-retry **only safe reads** (GET) with bounded backoff. Mutations never auto-retry unless they carry an idempotency key.
7. Add `Idempotency-Key` to `POST /orders` (required) and `POST /orders/{id}/payment-attempts` (recommended).
8. Never log tokens, phone numbers, full addresses, or response bodies containing PII.

### 7.3 Endpoint inventory (consumed)

Public: `GET /health`, `/catalog/departments`, `/catalog/categories`, `/catalog/products`, `/catalog/products/{slug}`.
Protected: `GET|PATCH /me`; `GET /cart`; `POST /cart/items`; `PATCH|DELETE /cart/items/{productId}`; `GET|POST /addresses`; `PATCH|DELETE /addresses/{id}`; `PUT /addresses/{id}/default`; `POST /orders`; `GET /orders`; `GET /orders/{id}`; `POST /orders/{id}/payment-attempts`; `POST /payments/verify`.

The app must **never** call `/api/webhooks/paystack`, `/api/cron/*`, web pages (`/shop`, `/cart`, …), or Server Actions.

### 7.4 App/universal links

- **Deadline path (P0):** custom scheme `daywell://`. Backend mobile callback redirects to `daywell://payment-return?reference=<ref>`; the app captures it through `openAuthSessionAsync`, then calls `POST /payments/verify`.
- **Hardening (P1):** Daywell-owned HTTPS universal/app link with `apple-app-site-association` and `assetlinks.json`, plus a web fallback page. Requires a controlled domain (the shared `vercel.app` host is not suitable for association files you control).
- The link carries a **reference only**, never a status. If the user closes the browser manually (`cancel`/`dismiss`), the app lands on the order screen and reads server state.

---

## 8. Authentication

### 8.1 Auth0 configuration (manual, one-time)

1. In the existing tenant, create a **Native** application. Enable **Authorization Code + PKCE**; no client secret in the app.
2. Keep **Google** (`google-oauth2`) as the only connection (enable it for the Native app).
3. Create/confirm an **Auth0 API** for Daywell; its identifier is `AUTH0_API_AUDIENCE` (backend env). Define minimum scopes (e.g. `read:profile`, `write:cart`… or keep to `openid profile email offline_access` if no custom scopes are enforced; record the decision).
4. Enable **Refresh Token Rotation** and request `offline_access`.
5. Register allowed callback and logout URLs for the app's scheme/bundle IDs exactly as produced by the SDK's config plugin; register iOS bundle ID and Android package + signing SHA-256.
6. Record every value in `docs/auth0-setup.md` (no secrets).

### 8.2 Client behaviour

- Login: `authorize({ audience: AUTH0_API_AUDIENCE, scope: "openid profile email offline_access", connection: "google-oauth2" })` or per the pinned SDK's documented API.
- The **access token** goes to the API. The ID token is used only to display name/avatar locally.
- Refresh tokens live only inside the SDK credentials manager; they are never sent to the Daywell API.
- Session restore on cold start: attempt silent credential retrieval; if valid, hydrate the session without showing the login screen; call `GET /me` to confirm.
- Sign out: clear SDK credentials + Auth0 session, clear TanStack Query cache (cart, orders, addresses, me), reset navigation to public stack.
- **Protected-action gating:** tapping Cart/Checkout/Orders/Account while signed out opens sign-in, then returns to the intended destination (store a `pendingRoute`, never sensitive data).

### 8.3 Same-account proof (graded)

Document in the README and demo video: log in on web with Google account A, log in on mobile with the same account, show `GET /me` (or the profile screen) returning the same email/name on both, and show the same cart.

---

## 9. Payments and Orders (Mobile Flow)

1. Checkout screen shows server totals (from `GET /cart`) and the demo notice.
2. User submits → app generates/reuses UUID idempotency key (persisted in memory + secure storage until resolved) → `POST /orders`.
3. Response gives order summary + `authorizationUrl` + `reference`. App stores `{orderId, reference}` locally (non-sensitive, for resume).
4. `WebBrowser.openAuthSessionAsync(authorizationUrl, "daywell://payment-return")`.
5. On any return (success redirect, cancel, dismiss, or app re-foreground): call `POST /payments/verify {reference}`; navigate to the order screen and render from server state.
6. Order screen polls `GET /orders/{id}` every ~3 s for up to ~60 s while status is `pending_payment` (webhook may confirm slightly later), then stops with a clear "still pending, check later" state.
7. Retry: if `pending_payment` and not expired, show **Pay again** → `POST /orders/{id}/payment-attempts`.
8. `409 PAYMENT_IN_PROGRESS` → show "A payment is already in progress" with a Check status action (not an error loop).

### 9.1 Mandatory distinct UI states

`loading/unknown`, `pending_payment`, `paid`, `failed`, `abandoned`, `expired`, `no network`, `session expired`, `rate limited`. These must never be collapsed into one generic error.

---

## 10. Screens and Navigation

Expo Router file-based routes (under `app/`):

```text
(public)/
  index                  Home: departments, featured, demo notice
  shop/[[department]]    Product list + filters + search
  products/[slug]        Product detail + Add to cart
(auth)/
  sign-in                Sign-in gate ("Continue with Google")
(tabs)/ (shown when signed in; guarded tabs prompt sign-in otherwise)
  home | shop | cart | orders | account
cart                     Cart (poll + sync)
checkout                 Delivery + summary + Pay
payment-return           Handles daywell://payment-return
orders/[id]              Order detail + status + retry
account/index            Profile (view/edit name, phone)
account/addresses        Address book (+ add/edit sheet)
```

Tab bar: Home, Shop, Cart (with live badge), Orders, Account. Cart/Orders/Account are visible to signed-out users but trigger the sign-in gate.

### 10.1 Required reusable components

`ProductCard`, `PriceText` (kobo → `₦1,500.00` using `Intl.NumberFormat("en-NG")`, **display only**), `StockBadge`, `RxBadge`, `QuantityStepper`, `CartLine`, `OrderSummary`, `AddressCard`, `AddressForm`, `StateSelect` (Nigerian states), `PhoneInput`, `OrderStatusBadge`, `DemoStoreNotice`, `ErrorState`, `EmptyState`, `OfflineBanner`, `SkeletonList`, `PrimaryButton` (loading/disabled, prevents double-submit).

---

## 11. UX, Design, Accessibility

- Follow `DESIGN.md` for colour, typography, spacing, cards, badges. Mirror its tokens into `src/theme/` (single source in the mobile repo; do not scatter hex values in components).
- Every list/screen has loading (skeleton), empty, error (with retry), and offline states.
- Accessibility: all controls have accessible labels/roles; minimum 44×44 pt touch targets; support Dynamic Type / font scaling without clipping; WCAG AA contrast; status never conveyed by colour alone (icon + text); form errors programmatically associated with fields and announced; logical focus order; works with VoiceOver and TalkBack.
- Keyboard: forms use `KeyboardAvoidingView`/scroll so the Pay button is never hidden; correct `keyboardType`/`textContentType`/`autoComplete` for phone, name, address.
- Haptics/animation are optional and must respect "reduce motion".
- Safe-area insets honoured on notched devices; works in light mode (dark mode P2 unless `DESIGN.md` defines it).

---

## 12. Security, Privacy, Reliability

- HTTPS only in release builds; reject `http://` base URLs at config validation.
- No secrets in the bundle: `EXPO_PUBLIC_*` variables are **public by definition**, so only non-secret values (API base URL, Auth0 domain, Auth0 client ID, API audience) may use that prefix. A startup check validates env with Zod and fails loudly.
- Tokens only in Keychain/Keystore-backed storage. Never in AsyncStorage, logs, crash reports, analytics, or Redux/Query devtools output.
- No card data ever touches the app (hosted Paystack page only).
- Screens containing PII (checkout, addresses) are excluded from OS app-switcher snapshots where the platform allows (P1).
- Logout wipes Query cache and any persisted cart/order data.
- Query cache persistence, if used, is limited to **public catalog data**; never persist cart/orders/addresses/profile to unencrypted disk.
- Deep-link handler validates scheme/host/path and accepts only a `reference` param matching an expected pattern; ignores everything else; **never** reads a status from the link.
- Dependency hygiene: pinned versions, `npm audit` reviewed before release, no unmaintained auth/storage libraries.
- Structured client logging via a small logger that redacts tokens, phones, addresses; log correlation id returned by the API (`x-correlation-id`) when present.

---

## 13. Performance and Reliability Targets

- Cold start to interactive home on a mid-range Android: **≤ 3 s** on Wi-Fi (release build).
- Catalog list scrolls at 60 fps (use `FlatList`/`FlashList` with stable keys, memoised row only where measured).
- Images: use `expo-image` with caching and placeholders; request sized images where the backend supports it.
- Product search is debounced (~300 ms) and cancels in-flight requests.
- Cart mutation round trip feels immediate (stepper updates optimistically, reconciles to server).
- Polling stops when backgrounded or when the cart screen is not visible.
- Crash-free: top-level error boundary with recoverable fallback; every async path handled.
- All timeouts, retries, and backoff constants live in one `config` module.

---

## 14. Testing Strategy

### 14.1 Unit (Jest + `@testing-library/react-native`)

- Money formatting (kobo → display), Nigerian phone client validation, Zod schemas (responses + forms).
- API client: bearer attachment, timeout, envelope parsing, `ContractError`, single-flight refresh, retry-once-on-401, no auto-retry on mutations, idempotency header present.
- Cart sync logic: polling on/off by focus + AppState, optimistic rollback, cache replacement by response.
- Deep-link parser: accepts valid `reference`, rejects status params, wrong host/scheme.
- Error-code → UI-state mapping covers every documented code.

### 14.2 Component/screen tests

Cart (loading, empty, error, populated, stock/limit errors), Checkout (saved vs custom, validation messages, double-tap guard), Order status (each state in §9.1).

### 14.3 Contract tests

A script that hits the **live** public endpoints and validates responses against the app's Zod schemas (run before release). Protected endpoints validated with a test token in a non-production environment.

### 14.4 Physical-device acceptance (required by the brief)

Run on at least **one real phone** (record model + OS version); both iOS and Android if available. Evidence = screen recording + notes in `docs/device-test-log.md`.

| #  | Step                                                                                         | Expected                                                              |
| -- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1  | Install the EAS build on the phone                                                           | App opens, public catalog loads with no login                         |
| 2  | Tap Cart signed out                                                                          | Sign-in gate appears                                                  |
| 3  | Continue with Google (account A)                                                             | System browser → returns to app signed in                             |
| 4  | Open Account/`GET /me`                                                                       | Shows account A email/name                                            |
| 5  | On a laptop, log into the **website** with account A                                         | Same email/name                                                       |
| 6  | On the website, add product X to the cart; leave the phone on the Cart screen                | X appears on the phone within ≤ 5 s without touching it              |
| 7  | Background the app, add product Y on the website, foreground the app                         | Y appears within ≤ 2 s                                                |
| 8  | On the phone, change X's quantity and remove Y                                               | Website cart reflects the changes after reload                        |
| 9  | Kill the app, reopen                                                                         | Still signed in; cart correct                                         |
| 10 | Sign out on the phone                                                                        | Credentials cleared; Cart shows sign-in gate                          |
| 11 | (Tier 2) Checkout with a Paystack test card                                                  | Returns to app; paid only after verified; order in history; email arrives |
| 12 | (Tier 2) Cancel payment in Paystack, then Pay again                                          | Same order, new attempt, no duplicate                                 |

### 14.5 Quality gates

`npm run typecheck`, `npm run lint`, `npm test` must pass. A release build must run on a device (`eas build`). CI (GitHub Actions) runs typecheck + lint + test on every push.

---

## 15. Project Structure

```text
.
├── .github/workflows/ci.yml
├── app/                        # Expo Router routes only (composition, no business logic)
│   ├── _layout.tsx
│   ├── (public)/ …
│   ├── (auth)/ …
│   ├── (tabs)/ …
│   ├── checkout.tsx
│   ├── payment-return.tsx
│   └── orders/[id].tsx
├── src/
│   ├── features/               # Domain logic + UI per feature, public index.ts only
│   │   ├── catalog/            # queries, hooks, components, schemas
│   │   ├── auth/               # Auth0 provider, session, route guard
│   │   ├── cart/               # queries, mutations, sync, components
│   │   ├── addresses/
│   │   ├── checkout/
│   │   ├── orders/
│   │   ├── payments/           # authorizationUrl handling, verify, return parsing
│   │   └── account/
│   ├── lib/
│   │   ├── api/                # THE fetch client, errors, envelope, schemas registry
│   │   ├── config.ts           # env validation (Zod), constants (timeouts, poll intervals)
│   │   ├── money.ts            # display formatting only
│   │   ├── phone.ts            # client-side validation hint
│   │   ├── logger.ts           # redacting logger
│   │   └── query-client.ts
│   ├── components/             # shared UI primitives
│   ├── theme/                  # tokens mirrored from DESIGN.md
│   ├── hooks/                  # shared hooks (useAppState, useRefreshOnFocus, useOnline)
│   ├── types/
│   └── mocks/                  # typed fixtures for EXPO_PUBLIC_API_MODE=mock (removable)
├── tests/{unit,component,contract}/
├── docs/
│   ├── adr/
│   ├── auth0-setup.md
│   ├── device-test-log.md
│   ├── api-contract-notes.md   # gaps/assumptions vs backend (§4.3)
│   └── runbook.md
├── app.config.ts
├── eas.json
├── .env.example
├── PRD.md
├── AGENTS.md
└── README.md
```

### Architecture rules

- `app/` is routing/composition only. Business logic lives in `src/features/*`.
- Features import each other only via `index.ts`.
- All networking goes through `src/lib/api`. Screens never call `fetch`.
- Server state lives in TanStack Query; no duplicated copies in component state.
- No business rules in components (no price math, no stock decisions, no payment-state inference).

---

## 16. Environment Variables

All non-secret; committed only as `.env.example`.

```env
EXPO_PUBLIC_API_MODE=live
EXPO_PUBLIC_API_BASE_URL=https://daywell-shop.vercel.app/api/v1
EXPO_PUBLIC_AUTH0_DOMAIN=
EXPO_PUBLIC_AUTH0_CLIENT_ID=
EXPO_PUBLIC_AUTH0_AUDIENCE=
EXPO_PUBLIC_APP_SCHEME=daywell
```

No client secret, Paystack key, Mailgun key, or database URL ever appears here. EAS profiles (`development`, `preview`, `production`) set per-environment values.

---

## 17. Milestones and Schedule

Time-boxed to the deadline (**Mon 5 Oct 2026, 11:59 PM WAT**). Work from the graded core outward.

| #   | Window (WAT)               | Milestone                         | Deliverable / exit check                                                                                  |
| --- | -------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| M0  | Sat night                  | Decisions + Auth0 setup           | Native app + API audience created; `docs/auth0-setup.md`; Expo project created; CI green                   |
| M1  | Sat night → Sun morning    | **Backend Tier 1 slice**          | `requireApiUser`, proxy bypass, `/health`, catalog, `/me`, cart endpoints deployed; curl-verified with a real token |
| M2  | Sun morning                | Mobile foundation                 | Config validation, API client, theme, Query client, navigation, mock mode                                  |
| M3  | Sun midday                 | Catalog UI (live)                 | Browse, filter, search, detail against production API                                                      |
| M4  | Sun afternoon              | **Auth + same-account proof**     | Google login on device; session restore; sign-out; `GET /me` matches web                                   |
| M5  | Sun evening                | **Cart + sync**                   | Cart UI + mutations + polling/foreground sync; **physical-device test steps 1–10 pass and are recorded**    |
| M6  | Mon morning                | Backend Tier 2 slice              | Addresses, `POST /orders`, orders reads, verify, mobile callback                                           |
| M7  | Mon midday                 | Addresses + checkout + payment    | Paystack test flow on device; verified paid state; retry                                                   |
| M8  | Mon afternoon              | Orders + hardening                | History/detail, error/offline/a11y pass, tests green                                                       |
| M9  | Mon evening (**hard stop 9 PM**) | Ship + submit               | Release build installed on phone, demo video, README, device log, submission posted before deadline        |

**Cut rule:** if M5 is not green by Mon morning, drop Tier 2 UI polish and protect the graded core. If M7 is at risk, ship Tier 1 + addresses + read-only orders and document known limitations honestly.

---

## 18. Definition of Done

### Task brief (graded)
- [ ] Mobile app installed and running on a **physical phone**.
- [ ] Same Google/Auth0 account logs into website **and** app (shown on video).
- [ ] Website cart add appears on the mobile app without restart within the §6 targets (shown on video).
- [ ] Mobile cart change visible on the website after reload.
- [ ] App uses the same `/api/v1` endpoints on the same backend; no second backend/DB.

### Technical quality
- [ ] All P0 requirements implemented (MFR-1…16, 18…31, 32, 33).
- [ ] Every API response validated by Zod; errors mapped to distinct UI states.
- [ ] No secrets in repo, git history, bundle, or env file.
- [ ] Tokens in secure storage only; logout wipes caches.
- [ ] `typecheck`, `lint`, `test` pass locally and in CI.
- [ ] Accessibility checklist (§11) verified on device with VoiceOver/TalkBack spot-check.
- [ ] Web app behaviour unchanged and its checks still pass.

### Documentation
- [ ] README: overview, features, stack, architecture diagram, setup, env vars, Auth0 setup, running on a device (dev build/EAS), tests, known limitations, demo flow, live API base URL.
- [ ] `docs/device-test-log.md` with the §14.4 results and device model/OS.
- [ ] `docs/api-contract-notes.md` listing any backend gaps/assumptions found.
- [ ] OpenAPI/endpoint notes in the backend repo match deployed handlers.

---

## 19. Final Submission Checklist

- [ ] `PRD.md` and `AGENTS.md` committed.
- [ ] GitHub repository pushed; CI green.
- [ ] Backend `/api/v1` deployed on `https://daywell-shop.vercel.app` and verified.
- [ ] Installable build (EAS internal distribution link / APK / TestFlight) available.
- [ ] Demo video: login on web + phone with the same account, web add → phone appears, phone change → web reflects, (Tier 2) payment + order.
- [ ] Device test log completed.
- [ ] README complete with known limitations stated honestly.
- [ ] Submitted before **Mon 5 Oct 2026, 11:59 PM WAT**.

---

## 20. Risks and Mitigations

| Risk                                                        | Impact | Mitigation                                                                                           |
| ----------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| **`/api/v1` not built; backend work eats the schedule**      | High   | Do M1 first; keep Tier 1 slice minimal; mock mode unblocks UI                                         |
| Auth0 Native/API misconfiguration (audience, callbacks)     | High   | Do M0 immediately; verify token claims (`aud`, `iss`, `sub`) with jwt.io-style decode before coding   |
| Wrong token type sent (ID token instead of access token)    | High   | Pass `audience` at login; unit test asserts the client uses the access token; backend rejects ID tokens |
| Expo Go can't run the Auth0 SDK                             | High   | Use a dev/EAS build from day one                                                                       |
| iOS build needs Apple Developer account/signing             | Med    | Prioritise Android APK for physical proof; add iOS if credentials are available                        |
| "Instant" sync is only polling                              | Med    | Define and demonstrate measurable targets (§6); keep optional SSE as P2                                |
| Polling trips rate limiter                                  | Med    | Exempt/raise limit on GET cart; ETag/304; stop polling when backgrounded                               |
| Paystack callback is cookie-bound on web                    | High   | Session-less mobile callback + `POST /payments/verify` (§4.3-1)                                         |
| Universal links need a controlled domain                    | Med    | Custom scheme for the deadline; universal links as hardening                                           |
| Deep link forged to fake "paid"                              | High   | Link carries reference only; app verifies via API                                                      |
| Contract drift between web and mobile                       | Med    | Zod response validation; contract-test script; `docs/api-contract-notes.md`                            |
| Duplicate orders from retries/double taps                   | High   | Idempotency-Key persisted per attempt; disabled button while pending                                    |
| Token leakage via logs                                      | High   | Redacting logger; lint rule banning `console.log` in `src/`                                             |
| Deadline pressure                                           | High   | Priority ladder (§0), cut rule (§17), hard stop at 9 PM Monday                                         |

---

## 21. Assumptions

Documented per the "never invent requirements silently" rule. Revise as facts are confirmed.

1. The deployed web app and Neon DB are healthy and match the web repo.
2. Auth0 tenant is accessible to the owner and can host a Native app and an API.
3. The backend owner (same person) can modify the web repo to add `/api/v1` within the schedule.
4. `DESIGN.md` exists in the mobile repo's reference set and defines the visual tokens (copy it or link it).
5. A physical Android phone is available; iOS device testing depends on Apple signing access.
6. Paystack and Mailgun remain in test/sandbox mode.
7. "Instantly" in the brief is satisfied by the measurable sync targets in §6 (foreground refetch + short polling).
