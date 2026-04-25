import type { HttpContext } from '@adonisjs/core/http'

import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '#core/user_management/support/activity_log'
import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { resolveInertiaMutation } from '../helpers/error_surface.js'
import { forgotPasswordValidator } from '../validators/user.js'

export default class ForgotPasswordController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/forgot-password', {})
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { request } = ctx
    const { email } = await request.validateUsing(forgotPasswordValidator)

    return resolveInertiaMutation(ctx, {
      action: async () => {
        try {
          await auth.requestPasswordReset(email)
        } catch {
          recordUserManagementActivityEvent(
            {
              entityId: 'authentication',
              entityType: 'auth',
              event: 'request_password_reset_failure',
              level: 'warn',
              metadata: { email },
              outcome: 'failure',
              tenantId: ctx.authSession?.session.activeOrganizationId ?? null,
              userId: ctx.authSession?.user.id ?? null,
            },
            new StructuredUserManagementActivitySink(ctx.logger)
          )
        }
      },
      successMessage: 'If an account with that email exists, a password reset link has been sent.',
    })
  }
}
