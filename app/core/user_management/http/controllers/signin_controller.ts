import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { userManagementHttpLogger } from '../helpers/activity_log.js'
import { writeSessionToken } from '../session/session_token.js'
import { loginValidator } from '../validators/user.js'

export default class SigninController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/signin', {})
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { email, password } = await ctx.request.validateUsing(loginValidator)
    const authLog = userManagementHttpLogger(ctx)

    try {
      const authentication = await authLog.run(() => auth.signIn(email, password), {
        failure: {
          entityId: 'authentication',
          entityType: 'auth',
          event: 'sign_in_failure',
        },
        success: (result) => ({
          entityId: result.user.id,
          entityType: 'user',
          event: 'sign_in_success',
        }),
      })

      writeSessionToken(ctx, {
        expiresAt: authentication.session.expiresAt,
        token: authentication.session.token,
      })

      return ctx.response.redirect('/dashboard')
    } catch (error) {
      return presentPublicError(ctx, error, { flashAll: true })
    }
  }
}
