import { boolean, pgSchema, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const authSchema = pgSchema('auth')

// =============================================================================
// Better Auth Core Tables
// =============================================================================

/**
 * user — Better Auth user table.
 * Stores authenticated users managed by Better Auth.
 */
export const user = authSchema.table('user', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  id: text('id').primaryKey(),
  image: text('image'),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  name: text('name').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

/**
 * session — Better Auth session table.
 * Stores active authentication sessions.
 */
export const session = authSchema.table('session', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  ipAddress: text('ip_address'),
  token: text('token').notNull().unique(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
})

/**
 * account — Better Auth account table.
 * Links authentication providers (credential, google, github, etc.) to users.
 */
export const account = authSchema.table('account', {
  accessToken: text('access_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  accountId: text('account_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  id: text('id').primaryKey(),
  idToken: text('id_token'),
  password: text('password'),
  providerId: text('provider_id').notNull(),
  refreshToken: text('refresh_token'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
})

/**
 * verification — Better Auth verification table.
 * Stores email verification tokens, password reset tokens, etc.
 */
export const verification = authSchema.table('verification', {
  createdAt: timestamp('created_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  value: text('value').notNull(),
})

// =============================================================================
// Type exports
// =============================================================================

export type InsertAccount = typeof account.$inferInsert
export type InsertSession = typeof session.$inferInsert
export type InsertUser = typeof user.$inferInsert
export type InsertVerification = typeof verification.$inferInsert
export type SelectAccount = typeof account.$inferSelect
export type SelectSession = typeof session.$inferSelect
export type SelectUser = typeof user.$inferSelect
export type SelectVerification = typeof verification.$inferSelect
