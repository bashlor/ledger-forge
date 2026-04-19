import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { forgotPasswordValidator } from '../validators/user.js'

export default class ForgotPasswordController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/forgot-password', {})
  }

  @inject()
  async store({ logger, request, response, session }: HttpContext, auth: AuthenticationPort) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    try {
      await auth.requestPasswordReset(email)
    } catch (error) {
      logger.error({ err: error }, 'Password reset request error')
    }

    session.flash(
      'success',
      'If an account with that email exists, a password reset link has been sent.'
    )
    return response.redirect().toPath(request.url())
  }
}
