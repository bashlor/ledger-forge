import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { presentAuthError } from '../presenters/auth_error_presenter.js'
import { writeSessionToken } from '../session/session_token.js'
import { signupValidator } from '../validators/user.js'

export default class SignupController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { email, fullName, password } = await ctx.request.validateUsing(signupValidator)

    try {
      const authentication = await auth.signUp(email, password, fullName ?? undefined)

      writeSessionToken(ctx, {
        expiresAt: authentication.session.expiresAt,
        token: authentication.session.token,
      })

      ctx.logger.info('Signup success')
      return ctx.response.redirect('/dashboard')
    } catch (error) {
      return presentAuthError(ctx, error as Error, 'E_SIGNUP_ERROR')
    }
  }
}
