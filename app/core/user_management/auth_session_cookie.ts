/**
 * Better Auth names cookies `${prefix}.session_token` (and similar for cache cookies).
 * Override the default prefix so cookie names stay stable and aligned with the
 * working implementation from the source project.
 */
export const AUTH_COOKIE_PREFIX = 'precision-ledger' as const

export const AUTH_SESSION_TOKEN_COOKIE_NAME = `${AUTH_COOKIE_PREFIX}.session_token` as const
