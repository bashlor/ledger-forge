import type { StructuredLogLevel } from '#core/common/logging/structured_log'

import { getDefaultStructuredLogFields, toIsoTimestamp } from '#core/common/logging/structured_log'
import env from '#start/env'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
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
    logger: {
      level: 'debug',
      log: (level, message, ...args) => {
        const isRoutineAuthFailure =
          typeof message === 'string' && /invalid.*(credential|password|email)/i.test(message)

        if (isRoutineAuthFailure) {
          recordActivity('better_auth_routine_failure', 'trace', 'failure', {
            argumentCount: args.length,
            message: String(message),
            source: 'better-auth',
          })
        } else {
          const rawLevel = (level as string) === 'success' ? 'info' : String(level)
          let normalizedLevel: StructuredLogLevel = 'info'
          if (rawLevel === 'trace') normalizedLevel = 'trace'
          else if (rawLevel === 'debug') normalizedLevel = 'debug'
          else if (rawLevel === 'warn') normalizedLevel = 'warn'
          else if (rawLevel === 'error') normalizedLevel = 'error'
          else if (rawLevel === 'fatal') normalizedLevel = 'fatal'

          recordActivity(
            'better_auth_log',
            normalizedLevel,
            normalizedLevel === 'error' || normalizedLevel === 'fatal' ? 'failure' : 'success',
            {
              argumentCount: args.length,
              message: String(message),
              source: 'better-auth',
            }
          )
        }
      },
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
