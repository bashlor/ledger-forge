/**
 * Auth configuration — Better Auth
 *
 * Authentication is now handled by Better Auth, NOT @adonisjs/auth.
 * Better Auth manages: users, sessions, accounts, and verification tokens.
 *
 * AdonisJS @adonisjs/session remains for:
 * - Flash messages
 * - CSRF tokens
 * - Other transient HTTP data
 *
 * The Better Auth instance is configured in:
 *   app/core/user_management/infra/auth/better_auth_drizzle.ts
 *
 * This file is kept for backward compatibility with the AdonisJS config
 * directory convention but no longer exports an @adonisjs/auth config.
 */
export {}
