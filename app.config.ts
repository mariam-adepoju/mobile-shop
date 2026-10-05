import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Native identifiers.
 *
 * These are FIXED for the life of the project: they are registered in the
 * Auth0 Native application (callback URLs, Android signing SHA-256) and in
 * both app stores. Changing one after release requires a new store listing.
 */
/**
 * Final and immutable: Auth0 binds its callback URLs to the app scheme, and
 * the app stores bind to this bundle/package name. Changing it later would
 * require re-registering the Auth0 application (AGENTS.md 8, PRD 7.4).
 */
const BUNDLE_ID = 'com.marrizon.daywell';

const DEFAULT_SCHEME = 'daywell';

/** RFC 3986 scheme, e.g. the `daywell://` payment-return link (PRD 7.4). */
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*$/;

function resolveScheme(): string {
  const scheme = process.env.EXPO_PUBLIC_APP_SCHEME?.trim() || DEFAULT_SCHEME;
  if (!SCHEME_PATTERN.test(scheme)) {
    throw new Error(
      `EXPO_PUBLIC_APP_SCHEME must be a lowercase URI scheme without spaces, got "${scheme}".`,
    );
  }
  return scheme;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Daywell',
  slug: 'daywell-mobile',
  owner: 'marrizons-team',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  // DESIGN.md defines a single light "gallery wall" palette; there is no dark
  // token set yet, so the OS dark mode is deliberately not followed.
  userInterfaceStyle: 'light',
  scheme: resolveScheme(),
  extra: {
    ...config.extra,
    eas: { projectId: '75d5c7f2-a6ac-4d07-b7e0-59b4308528d3' },
  },
  ios: {
    ...config.ios,
    bundleIdentifier: BUNDLE_ID,
  },
  android: {
    ...config.android,
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#f7f7f7',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    ...config.web,
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#f7f7f7',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    // Registers the Auth0 redirect scheme in AndroidManifest (Android) and in
    // Info.plist/CFBundleURLTypes (iOS). Without this, the browser redirect back
    // into the app never arrives and PKCE cannot complete. The SDK builds the
    // callback as `${bundleId}.auth0://<domain>/{ios|android}/${bundleId}/callback`,
    // so the plugin must stay in step with the URLs allowed in Auth0 (AGENTS.md 8).
    [
      'react-native-auth0',
      { domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? 'dev-3i3skll2b52f1j5t.us.auth0.com' },
    ],
  ],

  experiments: {
    typedRoutes: true,
    // React Compiler is still experimental in SDK 57 and silently inserts
    // memoisation, which AGENTS.md 5 asks us not to do implicitly.
    reactCompiler: false,
  },
});
