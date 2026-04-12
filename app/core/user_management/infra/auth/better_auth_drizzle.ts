import env from '#start/env'
import appLogger from '@adonisjs/core/services/logger'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { v7 as uuidv7 } from 'uuid'

import { AUTH_COOKIE_PREFIX } from '../../auth_session_cookie.js'

export async function createBetterAuth(
  drizzle: any,
  options: {
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
  const requireEmailVerification = env.get('REQUIRE_EMAIL_VERIFICATION')

  const {
    emailAndPassword = {
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 8,
      requireEmailVerification,
      sendResetPassword: async ({ url, user }) => {
        appLogger.info({ email: user.email, url }, 'Password reset email')
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
          typeof message === 'string' &&
          /invalid.*(credential|password|email)/i.test(message)

        if (isRoutineAuthFailure) {
          appLogger.trace({ args, source: 'better-auth' }, message)
        } else {
          const pinoLevel = level === 'success' ? 'info' : level
          appLogger[pinoLevel]({ args, source: 'better-auth' }, String(message))
        }
      },
    },
    secret,
    session,
  })
}
