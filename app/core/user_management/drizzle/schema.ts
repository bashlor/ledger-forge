import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

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
  publicId: text('public_id').notNull().unique(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// =============================================================================
// Better Auth Organization plugin (tenant = organization)
// =============================================================================

/**
 * organization — workspace / tenant root for the organization plugin.
 */
export const organization = authSchema.table('organization', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  id: text('id').primaryKey(),
  logo: text('logo'),
  metadata: text('metadata'),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
})

/**
 * member — user membership in an organization with a role (owner | admin | member).
 */
export const member = authSchema.table(
  'member',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    id: text('id').primaryKey(),
    isActive: boolean('is_active').notNull().default(true),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    inactiveAdminForbidden: check(
      'auth_member_inactive_admin_forbidden',
      sql`not (${table.isActive} = false and ${table.role} = 'admin')`
    ),
    orgUserUnique: uniqueIndex('auth_member_organization_id_user_id_unique').on(
      table.organizationId,
      table.userId
    ),
    roleCheck: check('auth_member_role_check', sql`${table.role} IN ('owner', 'admin', 'member')`),
  })
)

/**
 * invitation — pending invites to join an organization.
 */
export const invitation = authSchema.table('invitation', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role'),
  status: text('status').notNull().default('pending'),
})

/**
 * session — Better Auth session table.
 * Stores active authentication sessions and active organization (tenant) id.
 */
export const session = authSchema.table('session', {
  activeOrganizationId: text('active_organization_id').references(() => organization.id, {
    onDelete: 'set null',
  }),
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
    .references(() => user.id, { onDelete: 'cascade' }),
})

/**
 * dev_operator_access — local development grant for internal dev tools.
 * Only used in development workflows.
 */
export const devOperatorAccess = authSchema.table('dev_operator_access', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
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
    .references(() => user.id, { onDelete: 'cascade' }),
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
export type InsertDevOperatorAccess = typeof devOperatorAccess.$inferInsert
export type InsertInvitation = typeof invitation.$inferInsert
export type InsertMember = typeof member.$inferInsert
export type InsertOrganization = typeof organization.$inferInsert
export type InsertSession = typeof session.$inferInsert
export type InsertUser = typeof user.$inferInsert
export type InsertVerification = typeof verification.$inferInsert
export type SelectAccount = typeof account.$inferSelect
export type SelectDevOperatorAccess = typeof devOperatorAccess.$inferSelect
export type SelectInvitation = typeof invitation.$inferSelect
export type SelectMember = typeof member.$inferSelect
export type SelectOrganization = typeof organization.$inferSelect
export type SelectSession = typeof session.$inferSelect
export type SelectUser = typeof user.$inferSelect
export type SelectVerification = typeof verification.$inferSelect
