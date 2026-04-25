import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { runInertiaFormMutation } from '../helpers/error_surface.js'
import { writeSessionToken } from '../session/session_token.js'
import { loginValidator } from '../validators/user.js'

export default class SigninController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/signin', {})
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { email, password } = await ctx.request.validateUsing(loginValidator)

    return runInertiaFormMutation(
      ctx,
      async () => {
        const authentication = await auth.signIn(email, password)

        writeSessionToken(ctx, {
          expiresAt: authentication.session.expiresAt,
          token: authentication.session.token,
        })

        return ctx.response.redirect('/dashboard')
      },
      { flashAll: true }
    )
  }
}
