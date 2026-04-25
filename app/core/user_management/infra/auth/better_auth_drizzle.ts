import type { StructuredLogLevel } from '#core/common/logging/structured_log'

import { getDefaultStructuredLogFields, toIsoTimestamp } from '#core/common/logging/structured_log'
import env from '#start/env'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { anonymous, organization } from 'better-auth/plugins'
import { v7 as uuidv7 } from 'uuid'

import type { UserManagementActivitySink } from '../../support/activity_log.js'

import { AUTH_COOKIE_PREFIX } from '../../auth_session_cookie.js'
import * as authTables from '../../drizzle/schema.js'

export type BetterAuthInstance = Awaited<ReturnType<typeof createBetterAuth>>

export async function createBetterAuth(
  drizzle: any,
  options: {
    activitySink?: UserManagementActivitySink
    emailAndPassword?: {
      enabled: boolean
      maxPasswordLength?: number
      minPasswordLength?: number
      requireEmailVerification?: boolean
      sendResetPassword?: (data: { url: string; user: any }) => Promise<void>
    }
    secret?: string
    session?: {
      cookieCache?: {
        enabled?: boolean
        maxAge?: number
      }
      expiresIn?: number
      updateAge?: number
    }
  } = {}
) {
  function recordActivity(
    event: string,
    level: StructuredLogLevel,
    outcome: 'failure' | 'success',
    metadata?: Record<string, unknown>,
    entityId = 'authentication',
    entityType = 'auth',
    userId?: null | string
  ) {
    const defaults = getDefaultStructuredLogFields()

    activitySink?.record({
      context: 'UserManagement',
      entityId,
      entityType,
      event,
      level,
      metadata,
      outcome,
      requestId: defaults.requestId ?? 'system',
      tenantId: defaults.tenantId ?? null,
      timestamp: toIsoTimestamp(),
      userId: userId ?? defaults.userId ?? null,
    })
  }

  const requireEmailVerification = env.get('REQUIRE_EMAIL_VERIFICATION')

  const {
    activitySink,
    emailAndPassword = {
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 8,
      requireEmailVerification,
      sendResetPassword: async ({ url, user }) => {
        void url
        recordActivity(
          'password_reset_email_requested',
          'info',
          'success',
          undefined,
          String(user.id ?? user.email ?? 'unknown'),
          'user',
          String(user.id ?? null)
        )
        // TODO: Wire up a real email transport for production
      },
    },
    secret = env.get('BETTER_AUTH_SECRET'),
    session = {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
  } = options

  return betterAuth({
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      database: {
        generateId: () => uuidv7(),
      },
    },
    basePath: '/api/auth',
    baseURL: env.get('APP_URL'),
    database: drizzleAdapter(drizzle, {
      provider: 'pg',
      schema: {
        account: authTables.account,
        invitation: authTables.invitation,
        member: authTables.member,
        organization: authTables.organization,
        session: authTables.session,
        user: authTables.user,
        verification: authTables.verification,
      },
    }),
    databaseHooks: {
      user: {
        create: {
          before: async (userData) => {
            // Auto-verify email when email verification is disabled
            if (!requireEmailVerification) {
              return { data: { ...userData, emailVerified: true } }
            }
          },
        },
      },
    },
    emailAndPassword,
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const path = ctx.path
        const returned = ctx.context.returned
        const isError = returned instanceof Error || (returned as any)?.status >= 400
        const outcome: 'failure' | 'success' = isError ? 'failure' : 'success'

        const eventMap: Record<string, { event: string; level: StructuredLogLevel }> = {
          '/change-password': { event: 'user_change_password', level: 'info' },
          '/delete-user': { event: 'user_delete_account', level: 'warn' },
          '/forget-password': { event: 'user_forget_password', level: 'info' },
          '/reset-password': { event: 'user_reset_password', level: 'info' },
          '/sign-in/anonymous': { event: 'anonymous_sign_in', level: 'info' },
          '/sign-in/email': { event: 'user_sign_in', level: 'info' },
          '/sign-in/social': { event: 'user_social_sign_in', level: 'info' },
          '/sign-out': { event: 'user_sign_out', level: 'info' },
          '/sign-up/email': { event: 'user_sign_up', level: 'info' },
          '/update-user': { event: 'user_update_profile', level: 'info' },
          '/verify-email': { event: 'user_verify_email', level: 'info' },
        }

        const mapped = eventMap[path]
        if (mapped) {
          const actor = resolveBetterAuthHookActor(ctx.context)
          recordActivity(
            mapped.event,
            isError ? 'warn' : mapped.level,
            outcome,
            { path },
            actor.entityId,
            actor.entityType,
            actor.userId
          )
        }
      }),
    },
    plugins: [
      anonymous(),
      organization({
        allowUserToCreateOrganization: true,
      }),
    ],
    secret,
    session,
  })
}

/**
 * `newSession` is set on flows that create/replace a session (e.g. sign-in).
 * Session-scoped routes (sign-out, change-password, update-user) still expose the
 * current user on `context.session` — without this, the hook would log
 * `entityId: "unknown"` for those events.
 */
function resolveBetterAuthHookActor(context: {
  newSession?: null | { user?: { id?: unknown } }
  session?: null | { user?: { id?: unknown } }
}): { entityId: string; entityType: 'auth' | 'user'; userId: null | string } {
  const fromNew = context.newSession?.user?.id
  if (fromNew !== undefined && fromNew !== null && String(fromNew) !== '') {
    const id = String(fromNew)
    return { entityId: id, entityType: 'user', userId: id }
  }
  const fromCurrentSession = context.session?.user?.id
  if (
    fromCurrentSession !== undefined &&
    fromCurrentSession !== null &&
    String(fromCurrentSession) !== ''
  ) {
    const id = String(fromCurrentSession)
    return { entityId: id, entityType: 'user', userId: id }
  }
  return { entityId: 'authentication', entityType: 'auth', userId: null }
}
