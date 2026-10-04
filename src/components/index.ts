/**
 * Shared UI primitives (AGENTS.md 5).
 *
 * These know nothing about the API or about business rules; they render what
 * a feature hands them.
 */
export { AppText, Card, textStyles } from './text';
export type { TextRole } from './text';
export { Button } from './button';
export { Screen, SkeletonList, LoadingState, EmptyState, ErrorState } from './screen';
export { DemoStoreNotice } from './demo-store-notice';
