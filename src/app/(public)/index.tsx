import { Redirect } from 'expo-router';

/**
 * Entry point.
 *
 * Browsing is public (PRD 2, journey step 1), so the catalog is the default
 * destination. Sign-in, when it arrives in M4, redirects here first.
 */
export default function Index() {
  return <Redirect href="/home" />;
}
