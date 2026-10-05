# Auth0 + EAS device setup (M4)

Everything needed to sign in with Google on a physical Android phone.

This is the M4 deliverable named in AGENTS.md §13:

1. Create the Auth0 **Native** application and paste the exact URLs (§1–2).
2. Create an Android **development build** with EAS (§3).
3. Verify sign-in on the phone (§4).
4. Troubleshoot (§5).

**Why a development build is mandatory:** `react-native-auth0` contains native
code. Expo Go only ships its own bundled native modules, so the Auth0 SDK is
missing there and sign-in cannot work. A dev build compiles the SDK into the app.

---

## 0. Values used in this document

| Value | |
| --- | --- |
| Auth0 tenant domain | `dev-3i3skll2b52f1j5t.us.auth0.com` |
| Android package / iOS bundle ID | `com.marrizon.daywell` |
| App scheme (payment return, M7) | `daywell` |
| Auth0 redirect scheme | `com.marrizon.daywell.auth0` |

The bundle ID is **final**. It is baked into `app.config.ts` and is what Auth0
binds the callback URLs to. Changing it later means re-registering the Auth0
application and re-issuing store listings.

Two identifiers are yours to fill in, and are already in your local `.env`
(git-ignored, never committed):

- `EXPO_PUBLIC_AUTH0_CLIENT_ID`
- `EXPO_PUBLIC_AUTH0_AUDIENCE`

**None of these are secrets.** A native app cannot keep a secret: everything in
the bundle is readable. That is exactly why Auth Code + PKCE is used, and why the
API is protected by token validation rather than by a client secret (AGENTS.md §3.1).

---

## 1. Create the Auth0 Native application

1. Sign in to the [Auth0 Dashboard](https://manage.auth0.com).
2. **Applications → Create Application → Native.**
   (Not "Regular Web App" — that expects a cookie session.)
3. In **Settings → Application Settings**, set:
   - **Token Endpoint Authentication** → `None`
     (public client; the app must not and cannot hold a client secret)
   - **Grant Types** → tick **Authorization Code**.
     Leave "Implicit" **off**: the app uses PKCE.

### Where the URLs come from

These are not guesses. They follow the format the installed SDK documents, in
`node_modules/react-native-auth0/lib/typescript/src/types/parameters.d.ts`:

> **Android:** `com.marrizon.daywell.auth0://dev-3i3skll2b52f1j5t.us.auth0.com/android/com.marrizon.daywell/callback`
> **iOS:** `com.marrizon.daywell.auth0://dev-3i3skll2b52f1j5t.us.auth0.com/ios/com.marrizon.daywell/callback`

`{AUTH0_DOMAIN}` is your tenant host with **no** `https://` prefix.

### Google connection

1. **Authentication → Social → Google → Settings.**
2. Enter the Google Client ID and Secret you were given.
3. Save. The connection must show as **enabled**.

The app requests `connection: 'google-oauth2'`, so Google must be switched on.

---

## 2. Paste these URLs

### Allowed Callback URLs — add both

```
com.marrizon.daywell.auth0://dev-3i3skll2b52f1j5t.us.auth0.com/android/com.marrizon.daywell/callback
com.marrizon.daywell.auth0://dev-3i3skll2b52f1j5t.us.auth0.com/ios/com.marrizon.daywell/callback
```

### Allowed Logout URLs — add both

```
com.marrizon.daywell.auth0://dev-3i3skll2b52f1j5t.us.auth0.com/android/com.marrizon.daywell/callback
com.marrizon.daywell.auth0://dev-3i3skll2b52f1j5t.us.auth0.com/ios/com.marrizon.daywell/callback
```

Click **Save Changes**.

> ### ⚠️ The scheme is `com.marrizon.daywell.auth0://`, not `daywell://`
>
> The SDK builds the redirect as `${bundleId}.auth0`. The app does **not** override
> `redirectUrl`, so this default applies. Pasting `daywell://…` will make sign-in
> fail with an "invalid redirect URI" error.
>
> `daywell://` is a *different* scheme, used later for the Paystack payment return
> deep link (M7, PRD §7.4). Keep the two apart.
>
## 3. Create an Android development build with EAS

EAS builds in the cloud, so you do not need Android Studio or a JDK.

### Step 1 — Create an Expo account

Go to <https://expo.dev/signup> and sign up (free).

### Step 2 — Log in from the terminal

```bash
npx eas-cli login
```

A browser opens. Confirm the code shown matches the one in the terminal.

### Step 3 — Link the project to your account

```bash
npx eas-cli build:configure
```

Choose **Android only**. If offered, accept the EAS project creation. This writes
`eas.json`.

### Step 4 — Check the profile in `eas.json`

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  }
}
```

- `developmentClient: true` — this is what makes it a **dev build** rather than a
  release build. Required, because of the native Auth0 module.
- `distribution: "internal"` — produces an installable APK rather than an `.aab`
  for the Play Store.

### Step 5 — Give EAS your environment values

Your `.env` is git-ignored, so EAS's cloud build **cannot see it**. Push the
values once, into the `development` environment:

```bash
npx eas-cli env:create --environment development --name EXPO_PUBLIC_AUTH0_DOMAIN    --value "dev-3i3skll2b52f1j5t.us.auth0.com" --visibility plaintext
npx eas-cli env:create --environment development --name EXPO_PUBLIC_AUTH0_CLIENT_ID --value "<your client id>"   --visibility plaintext
npx eas-cli env:create --environment development --name EXPO_PUBLIC_AUTH0_AUDIENCE  --value "<your audience>"   --visibility plaintext
npx eas-cli env:create --environment development --name EXPO_PUBLIC_API_MODE       --value "mock"              --visibility plaintext
npx eas-cli env:create --environment development --name EXPO_PUBLIC_API_BASE_URL   --value "https://daywell-shop.vercel.app/api/v1" --visibility plaintext
npx eas-cli env:create --environment development --name EXPO_PUBLIC_APP_SCHEME      --value "daywell"           --visibility plaintext
```

`plaintext` is correct here: every one of these is a **public** identifier, by
design (AGENTS.md §3.1). No Paystack key, Mailgun key, Neon URL or Auth0 client
secret may ever be added to EAS as a build variable.

Check what is set:

```bash
npx eas-cli env:list --environment development
```

### Step 6 — Build

```bash
npx eas-cli build --platform android --profile development
```

The first build takes **10–20 minutes** (it downloads Gradle and the Android
SDK). Later builds are much faster.

It ends with a link:

```
✔ Build finished
https://expo.dev/artifacts/eas/xxxxxxxxxxxx.apk
```

### Step 7 — Install the APK on your phone

Pick whichever is easiest:

- **From the link (easiest):** open the URL on the phone while signed in to
  expo.dev → tap **Install**.
- **Transfer the file:** download the `.apk` to your PC, copy it to the phone
  (USB / cable / Drive), open it. Android will ask you to allow **"install from
  unknown sources"** for the app doing the installing — enable it, then tap the
  `.apk` again.
- **Over USB:** enable Developer options → USB debugging, connect the phone, run
  `adb install <path-to-apk>`.

### Step 8 — Start the JS server
## 4. Verify sign-in on the phone

Walk PRD §14.4 steps 2–5 and 10:

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the app signed out | Catalog loads with **no login** |
| 2 | Tap **Account**, **Cart** or **Orders** | Redirected to sign-in |
| 3 | Tap **Continue with Google** | System browser opens (not an in-app WebView) |
| 4 | Pick account A | Browser closes, app returns signed in, lands on the tab you asked for |
| 5 | Open **Account** | `GET /me` shows account A's email and name |
| 10 | Tap **Sign out** | Credentials cleared, the tab shows the sign-in gate again |

Sign out also clears the whole Query cache, so no cached personal data survives.

### Expected limitation

**`GET /me` cannot succeed until the backend Tier 1 slice is deployed.** In mock
mode `/api/v1` returns 404 (see `docs/api-contract-notes.md`), so the Account
screen will show a retry state. Steps 1–4 and 10 still prove the Auth0 flow
itself: the browser round trip, PKCE, secure token storage, session restore and
sign-out all work. The `GET /me` proof of a shared identity (MFR-9) needs the
live API.

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| **"invalid redirect_uri" / "page not found"** in the browser | Callback URL does not match exactly | Re-copy both URLs from §2. Check the scheme is `com.marrizon.daywell.auth0`, not `daywell`. Watch for trailing whitespace. |
| Browser opens, app never comes back | The redirect scheme is not registered on the device | `react-native-auth0` must be in `plugins` in `app.config.ts`. Rebuild — a config plugin change needs a new native build, not just a JS reload. |
| "Sign-in is not available in this build" | Auth0 env values missing at build time | Run `npx eas-cli env:list --environment development`, then rebuild. |
| Expo Go opens instead of the Daywell app | Expo Go was launched rather than the dev build | Use `npx expo start --dev-client`. |
| `MissingTokenError` in the logs | A protected request was made with no session | This is correct behaviour: the client refuses to send it. It means something is not behind `RequireAuth`. |
| Google returns immediately to the app, no login page | Google social connection not enabled, or no Google credentials | Auth0 Dashboard → Authentication → Social → Google. |
| Works, but the Account screen errors | `/api/v1` not deployed yet (expected in mock mode) | See "Expected limitation" in §4. Not an Auth0 problem. |

### Check a token safely

Never decode tokens in app code. For debugging only, in a throwaway local script
that prints nothing sensitive — the shape alone shows `aud` and `scope`:

```bash
node -e "const p=process.argv[1].split('.')[1];console.log(JSON.stringify(JSON.parse(Buffer.from(p,'base64url')),null,2).slice(0,400))" "<PAYLOAD>"
```

You are looking for `aud` = your API audience, and `scope` containing
`openid profile email offline_access`. Do not commit or share the output.

---

## 6. What was built (for reference)

| Concern | File |
| --- | --- |
| Expo config plugin (registers the redirect scheme) | `app.config.ts` |
| Auth0 client, audience/scope/connection | `src/features/auth/auth0-client.ts` |
| Session: restore, sign in, sign out, pending route | `src/features/auth/session.tsx` |
| Token bridge into the API client | `src/features/auth/token-manager.ts` |
| `GET /me` | `src/features/account/me.ts` |
| Protected-route guard | `src/components/require-auth.tsx` |
| Sign-in screen | `src/app/(auth)/sign-in.tsx` |
| Account screen | `src/app/(tabs)/account.tsx` |

Security properties, per AGENTS.md §3:

- Only the **access token** is sent to the API; the ID token never is.
- Tokens live only in the SDK's Keychain/Keystore-backed store and never enter
  React state, AsyncStorage, logs or the Query cache.
- No client secret exists anywhere in the app.
- Sign-out clears the SDK session and the entire Query cache.
- A 401 triggers **one** shared refresh, retried once; a second 401 signs out.

---

## Related documents

- `docs/api-contract-notes.md` — what is deployed vs assumed, including the
  backend pagination contract and why `/api/v1` is currently 404.
- `AGENTS.md` §8 (auth rules), §11 (security checklist), §13 (milestones).

Phone and computer must be on the **same Wi-Fi network**.

```bash
npx expo start --dev-client
```

A QR code appears. To open the app on the phone:

- scan the QR code with the phone's camera / QR app, or
- if the phone is connected by USB with debugging on, press `a` in the terminal
  to launch on that device.

The installed **Daywell** app (not Expo Go) receives the URL and loads your
JavaScript.

---
> Both schemes are registered by the `react-native-auth0` config plugin in
> `app.config.ts`, so no manual manifest editing is needed.

---