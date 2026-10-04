// Hermetic defaults so tests never depend on a developer's local `.env`.
// Individual suites override these per-test with explicit objects.
process.env.EXPO_PUBLIC_API_MODE ??= 'mock';
process.env.EXPO_PUBLIC_API_BASE_URL ??= 'https://daywell-shop.vercel.app/api/v1';
process.env.EXPO_PUBLIC_APP_SCHEME ??= 'daywell';
