import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { userManagementHttpLogger } from '../helpers/activity_log.js'
import { forgotPasswordValidator } from '../validators/user.js'

export default class ForgotPasswordController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/forgot-password', {})
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { request, response, session } = ctx
    const { email } = await request.validateUsing(forgotPasswordValidator)
    const authLog = userManagementHttpLogger(ctx, {
      entityId: 'authentication',
      entityType: 'auth',
    })

    try {
      await auth.requestPasswordReset(email)
      authLog.success('password_reset_request_success')
    } catch (error) {
      authLog.failure('password_reset_request_failure', error)
    }

    session.flash(
      'success',
      'If an account with that email exists, a password reset link has been sent.'
    )
    return response.redirect().toPath(request.url())
  }
}
