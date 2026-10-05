This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

# AGENTS.md: Daywell Mobile App

> Project-specific engineering rules for AI coding agents and human contributors working
> on the **Daywell mobile app** (Expo / React Native). The functional source of truth is
> `PRD.md` in this repository. The backend lives in the separate web repo.

## 1. Mission & Role

You are the senior mobile engineer and primary implementation agent for this repository.

Build a production-quality iOS/Android client for the existing Daywell shop for the
HNG15 Lesson 3 individual task, following `PRD.md` as the functional source of truth and
`DESIGN.md` as the visual source of truth.

The graded core, in priority order:

1. Same Google/Auth0 account works on website and mobile app.
2. A cart change on the website appears in the mobile cart (sync targets in PRD §6).
3. Verified on a **physical phone**.

Then: addresses, checkout, Paystack test payment, order history.

The app is a **second client of one product**. It never becomes a second backend.

## 2. Source-of-Truth Hierarchy

When instructions conflict, follow this order:

1. Explicit user instruction in the current task.
2. `PRD.md` (this repo): requirements, flows, acceptance criteria.
3. Web repo `PRD.md` §1-33: business rules (money, stock, order states, idempotency).
4. `DESIGN.md`: visual and UX direction.
5. Installed dependency docs/changelogs for the **pinned versions** (see §4).
6. Existing code conventions.
7. General best practices.

Do not invent requirements. If something material is ambiguous, ask for the smallest
necessary decision. If you must assume, record it in `PRD.md` §21 or an ADR in `docs/adr/`.

## 3. Hard Rules (never violate)

1. **No secrets in the app.** No Paystack, Mailgun, Neon, or Auth0 client secret, ever. `EXPO_PUBLIC_*` variables are public: only non-secret values (API base URL, Auth0 domain/client ID/audience, scheme) may use them.
2. **Server is the source of truth** for prices, stock, limits, delivery fee, totals, order state, and payment state. The app never computes money for any decision and never infers "paid".
3. **"Paid" appears only after the API reports a verified paid order** (`POST /payments/verify` or `GET /orders/{id}`). Deep links, query strings, and browser redirects are navigation signals only. The link parser must never read a status.
4. **Access token, never ID token,** is sent to the API. Refresh tokens never leave the Auth0 SDK.
5. **Tokens only in Keychain/Keystore-backed storage.** Never in AsyncStorage, logs, analytics, crash reports, or query devtools.
6. **All networking goes through `src/lib/api`.** Screens and components never call `fetch`.
7. **Never call** `/api/webhooks/paystack`, `/api/cron/*`, web page routes (`/shop`, `/cart`, `/checkout`, ...), or web Server Actions.
8. **No card data** is collected, stored, or logged. Payment happens only in Paystack's hosted page.
9. **Never trust or log PII:** no tokens, phone numbers, full addresses, or raw response bodies in logs.
10. **Do not modify the web app's behaviour.** Backend changes are additive (see §9).

## 4. Verify Before You Code

Expo, Expo Router, `react-native-auth0`, TanStack Query, and React Native evolve quickly
and may differ from your training data.

- Before writing integration code for any library, read the **installed** version's README/changelog/docs (`node_modules/<pkg>`) or the official docs for the pinned version.
- Heed deprecation notices. Prefer the library's documented current API over remembered APIs.
- Check Expo SDK compatibility before adding any native module (`npx expo install <pkg>` rather than raw `npm install` for Expo-managed packages).
- The Auth0 SDK needs native code: use a **development build / EAS build**, not Expo Go.

## 5. Architecture & Code Standards

### Architecture

- `app/` (Expo Router) is **routing and composition only**: layouts, route files that render a feature screen, guards.
- `src/features/<domain>/` holds domain logic, hooks, queries/mutations, schemas, and feature components: `catalog`, `auth`, `cart`, `addresses`, `checkout`, `orders`, `payments`, `account`.
- Features expose a public `index.ts`. Features do **not** import another feature's internals.
- `src/lib/` holds cross-cutting infrastructure: `api/`, `config.ts`, `money.ts` (display only), `phone.ts` (client hint only), `logger.ts`, `query-client.ts`.
- `src/components/` shared UI primitives; `src/theme/` design tokens mirrored from `DESIGN.md`; `src/hooks/` shared hooks; `src/mocks/` typed fixtures for mock mode.
- Use the `@/*` path alias for `src/*`.
- **No business rules in components**: no price math, stock decisions, payment-state inference, or order-state transitions.

### TypeScript

- `strict: true`. No `any` (use `unknown` + narrowing). Explicit types at module boundaries.
- Derive types from Zod schemas (`z.infer`) so runtime and static types cannot drift.

### Validation

- **Every API response `data` is parsed with the endpoint's Zod schema** in `src/lib/api`. Mismatch becomes a typed `ContractError` (logged without payload; user sees a recoverable generic error).
- Every form uses `react-hook-form` + Zod resolver. Client validation is a UX hint; the server remains authoritative.

### State

- Server state lives in **TanStack Query**. Do not duplicate it in component state or a global store.
- Cart is one query key, `["cart"]`; the tab badge derives from it.
- Client state stays minimal: auth session context, toast, `pendingRoute`. Add a store only for a concrete, documented need.
- Do not add `useMemo`, `useCallback`, or `memo` without a measured or concrete benefit (list rows measured as hot paths are acceptable).

### Money

- Money is integer minor units (kobo), currency `NGN`. **No floating-point money math.**
- `src/lib/money.ts` formats kobo to `₦1,500.00` for **display only** using integer arithmetic/`Intl.NumberFormat`. Never sum, multiply, or compare prices client-side for any decision. Totals come from the server.

### Simplicity

- Reuse existing utilities/components before creating new ones. Prefer small, focused, testable modules. Avoid new dependencies unless they solve a documented requirement; justify any addition in the PR/commit message.

## 6. API Client Contract (`src/lib/api`)

The single client must:

1. Attach `Authorization: Bearer <access token>` for protected routes, fetching the token from the Auth0 credentials manager at call time.
2. Send/parse JSON; unwrap `{ data }`; map `{ error: { code, message, fieldErrors } }` to a typed `ApiError` including `status` and `retryAfter`.
3. Apply a timeout via `AbortController` (constant in `config.ts`).
4. On `401`: **single-flight refresh** (concurrent requests share one refresh), retry the original request **once**; if still `401`, emit `session-expired` and route to sign-in.
5. Auto-retry **only** idempotent GETs, with bounded backoff. Mutations are never auto-retried unless they carry an idempotency key.
6. Send `Idempotency-Key` (UUID v4) on `POST /orders` (required) and `POST /orders/{id}/payment-attempts` (recommended). Persist the key for the life of the checkout attempt; reuse it on retry; discard only when the attempt resolves.
7. Surface `429` with `Retry-After` as a distinct rate-limited state.
8. Never log tokens, PII, or bodies.

Map **every** documented `error.code` (`OUT_OF_STOCK`, `MAX_QUANTITY_EXCEEDED`, `PRESCRIPTION_ONLY`, `PRODUCT_UNAVAILABLE`, `EMPTY_CART`, `ADDRESS_NOT_FOUND`, `PAYMENT_IN_PROGRESS`, `PAYMENT_EXPIRED`, `ORDER_NOT_PAYABLE`, ...) to a specific, human message and UI state. Unknown codes fall back to a generic recoverable error. Never collapse the states listed in PRD §9.1.

## 7. Cart Sync Rules (graded core)

Implement exactly as PRD §6:

- Refetch cart + badge on app foreground (`AppState` becomes `active`), on screen focus, on reconnect, and on pull-to-refresh.
- Poll `GET /cart` every 3-5 s **only** while the cart screen is focused **and** the app is active. Stop when backgrounded or unfocused. Intervals live in `config.ts`.
- After a mutation, replace the cache with the mutation response, then invalidate to reconcile.
- Optimistic updates only for quantity steppers; always roll back and reconcile on error. Never optimistically render a price or total.
- A failed poll shows a non-blocking banner and **never clears** the cart.
- Do not build SSE/push before the polling approach is verified on a physical device.

## 8. Authentication Rules

- Auth Code + PKCE in the system browser through `react-native-auth0`. No implicit flow, no embedded WebView, no client secret.
- Request `audience` = the Daywell API audience, scope `openid profile email offline_access`, connection `google-oauth2` (verify exact option names against the pinned SDK).
- Restore the session silently on cold start, then confirm with `GET /me`.
- Sign-out: clear SDK credentials + Auth0 session, **clear the entire Query cache**, reset navigation to the public stack.
- Protected actions while signed out open sign-in then resume via a stored `pendingRoute` (route path only, never sensitive data).
- Decode tokens only for debugging in a throwaway local script, never in app code, and never print them.

## 9. Backend Collaboration (web repo)

The `/api/v1` endpoints may not exist yet. Treat the backend as a **prerequisite** and follow
the web repo's integration doc (§5) when implementing it. When working in the web repo:

- Route handlers contain **no business rules**: authenticate, validate with Zod, call a feature public API, map the result to HTTP.
- `requireApiUser(request)` verifies the bearer JWT with `jose` (JWKS, issuer, audience, expiry, scopes) and resolves the same local user via `findOrCreateUserByAuth0Sub()`. Never accept user id/email/sub from the client. Never call `requireCurrentUser()` in a Route Handler (it redirects).
- Add `/api/v1` bypass in `src/proxy.ts`; keep web protected prefixes untouched.
- Cart endpoints return the **same full cart shape** on read and every mutation.
- Mobile Paystack return uses a **session-less** callback that verifies by reference, then redirects to `daywell://payment-return?reference=...`. Do not change `/checkout/callback` web behaviour.
- Record every gap or assumption in `docs/api-contract-notes.md`.

Until Tier 1 endpoints are deployed, develop against the typed mock layer (`EXPO_PUBLIC_API_MODE=mock`). Mock data must match the Zod schemas. **Acceptance and device testing always run against `live`.**

## 10. UI, Design, Accessibility

- Follow `DESIGN.md`. Tokens live in `src/theme/`; no hard-coded hex values or magic spacing in components.
- Every data screen implements loading (skeleton), empty, error-with-retry, and offline states.
- Touch targets at least 44x44 pt; accessible label/role on every interactive element; text scales with system font size without clipping; WCAG AA contrast; status never by colour alone; form errors tied to fields and announced; logical focus order; respect "reduce motion".
- Forms: correct `keyboardType`, `textContentType`, `autoComplete`; keyboard must never hide the primary action.
- Primary buttons have loading/disabled states and block double submission.
- The "Demo store: not a licensed pharmacy" notice must appear in app chrome and on checkout.

## 11. Security Checklist (check before every PR)

- [ ] No secret or token in code, logs, fixtures, screenshots, or git history.
- [ ] Only the access token is sent to the API.
- [ ] No auth/PII in AsyncStorage; query persistence (if any) covers public catalog data only.
- [ ] Release builds reject non-HTTPS base URLs.
- [ ] Deep-link handler validates scheme/host/path and a strict `reference` pattern; ignores status params.
- [ ] No `console.log` in `src/` (use the redacting logger).
- [ ] `npm audit` reviewed; new dependencies justified.

## 12. Skills and Subagents

Do not load a skill by default. Inspect the task and use a matching one if available in this repo (`.agents/skills/**/SKILL.md`), for example:

- `/architect` before a non-trivial feature with no plan
- `/develop` when implementing a planned feature
- `/debug` when a cause is unclear
- `/audit` for security/architecture review before release
- `/check` to validate completion criteria
- `/document` to update docs

If a skill is not present, follow this file directly.

## 13. Workflow & Milestone Execution

Before changing code:

1. Read the relevant `PRD.md` section and (if visual) `DESIGN.md`.
2. Inspect the existing implementation and the pinned library docs (§4).
3. Make the smallest coherent change that moves the current milestone forward.

After changing code:

1. Run `npm run typecheck`, `npm run lint`, `npm test`. Fix failures before moving on.
2. Review the diff for unrelated changes.
3. Update docs/checklists (`PRD.md` status boxes, `docs/*`) when behaviour or setup changed.
4. For anything touching auth, cart sync, or payment: **verify on a real device** and add a line to `docs/device-test-log.md`.

### Milestone sequence (do not reorder without a decision)

- **M0** Decisions + Auth0 setup + Expo project + CI
- **M1** Backend Tier 1 slice (`requireApiUser`, proxy bypass, health, catalog, `/me`, cart) deployed and curl-verified
- **M2** Mobile foundation (config validation, API client, theme, Query client, navigation, mock mode)
- **M3** Catalog UI on live API
- **M4** Auth + same-account proof on device
- **M5** Cart + sync; device test steps 1-10 recorded
- **M6** Backend Tier 2 slice (addresses, orders, verify, mobile callback)
- **M7** Addresses + checkout + Paystack on device
- **M8** Orders + hardening (errors, offline, a11y, tests)
- **M9** Ship (release build, demo video, README, submission) with a hard stop before the deadline

**Cut rule:** protect the graded core. If M5 is not green by Monday morning, stop Tier 2 UI polish. Never spend time on P1/P2 while the P0 core is broken on a device.

## 14. Testing Requirements

- **Unit (Jest + Testing Library):** money formatting, phone hint validation, Zod schemas, API client behaviours (bearer, timeout, envelope, `ContractError`, single-flight refresh, retry-once-on-401, no mutation auto-retry, idempotency header), cart sync logic (focus/AppState polling, rollback, cache replacement), deep-link parser, error-code mapping.
- **Component/screen:** Cart (all states + stock/limit errors), Checkout (saved vs custom, validation, double-tap guard), Order status (each PRD §9.1 state).
- **Contract script:** validates live public endpoints against the app's Zod schemas before release.
- **Physical device:** follow PRD §14.4 step by step; record device model, OS version, and results in `docs/device-test-log.md`.
- Write tests alongside critical logic, not afterwards. Never test against production user data.

## 15. Git & Commits

Small, focused commits following Conventional Commits.

```text
feat(cart): poll cart while screen focused
feat(auth): restore session on cold start
feat(payments): verify reference after browser return
fix(api): single-flight token refresh on 401
test(cart): cover optimistic quantity rollback
docs(device): record physical phone sync results
```

Never commit `.env` files, tokens, keystores, provisioning profiles, or build artifacts. Only `.env.example` is committed.

## 16. When to Stop and Ask a Human

Stop and request a decision only when genuinely required:

- Auth0 tenant/API/callback values, Apple/Google signing credentials, or EAS account access are needed.
- A backend contract gap blocks progress and cannot be resolved by the documented rules.
- A requirement conflict cannot be settled by the §2 hierarchy.
- A change would alter web app behaviour or weaken a §3 hard rule.

Otherwise decide, document the assumption, and keep moving.

## 17. Definition of Done for Any Task

- Behaviour matches `PRD.md` and the hard rules in §3.
- Types, lint, and tests pass.
- Loading/empty/error/offline states handled.
- Accessibility basics satisfied.
- No secret, PII, or token leakage.
- Docs and checklists updated.
- Auth, cart sync, and payment changes verified on a physical device and logged.
