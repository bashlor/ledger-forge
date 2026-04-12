import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { presentAuthError } from '../presenters/auth_error_presenter.js'
import { writeSessionToken } from '../session/session_token.js'
import { loginValidator } from '../validators/user.js'

export default class SigninController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/signin', {})
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { email, password } = await ctx.request.validateUsing(loginValidator)

    try {
      ctx.logger.info({ email }, 'Login attempt')
      const authentication = await auth.signIn(email, password)

      writeSessionToken(ctx, {
        expiresAt: authentication.session.expiresAt,
        token: authentication.session.token,
      })

      ctx.logger.info({ email }, 'Login success')
      return ctx.response.redirect('/dashboard')
    } catch (error) {
      return presentAuthError(ctx, error as Error, 'E_INVALID_CREDENTIALS')
    }
  }
}
