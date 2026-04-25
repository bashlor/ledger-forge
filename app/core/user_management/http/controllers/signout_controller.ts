import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '../../support/activity_log.js'
import { clearSessionToken, readSessionToken } from '../session/session_token.js'

export default class SignoutController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const sessionToken = readSessionToken(ctx)
    const isAnonymous = ctx.authSession?.user.isAnonymous ?? false

    try {
      if (sessionToken) {
        await auth.signOut(sessionToken)
      } else {
        recordUserManagementActivityEvent(
          {
            entityId: 'authentication',
            entityType: 'auth',
            event: 'sign_out_missing_session',
            level: 'warn',
            metadata: { isAnonymous },
            outcome: 'failure',
            tenantId: ctx.authSession?.session.activeOrganizationId ?? null,
            userId: ctx.authSession?.user.id ?? null,
          },
          new StructuredUserManagementActivitySink(ctx.logger)
        )
      }
    } catch (error) {
      recordUserManagementActivityEvent(
        {
          entityId: ctx.authSession?.user.id ?? 'authentication',
          entityType: 'auth',
          event: 'sign_out_failure',
          level: 'error',
          metadata: {
            errorName: error instanceof Error ? error.name : 'UnknownError',
            isAnonymous,
          },
          outcome: 'failure',
          tenantId: ctx.authSession?.session.activeOrganizationId ?? null,
          userId: ctx.authSession?.user.id ?? null,
        },
        new StructuredUserManagementActivitySink(ctx.logger)
      )
    }

    clearSessionToken(ctx)
    return ctx.response.redirect('/')
  }
}
