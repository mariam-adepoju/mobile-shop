/**
 * Account feature (AGENTS.md 5).
 *
 * Owns `GET /me`: the caller's server-side identity, which is what proves the
 * mobile session maps to the same user as the web session (MFR-9).
 */
export { MeSchema, fetchMe, meKey, meQueryOptions, type Me } from './me';
