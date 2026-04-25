import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { runInertiaFormMutation } from '../helpers/error_surface.js'
import { resetPasswordValidator } from '../validators/user.js'

export default class ResetPasswordController {
  async show({ inertia, request }: HttpContext) {
    const token = request.qs().token as string | undefined
    return inertia.render('auth/reset-password', { token: token ?? '' })
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { newPassword, token } = await ctx.request.validateUsing(resetPasswordValidator)

    return runInertiaFormMutation(
      ctx,
      async () => {
        await auth.resetPassword(token, newPassword)
        ctx.session.flash('success', 'Your password has been reset. You can now log in.')
        return ctx.response.redirect('/signin')
      },
      {
        errorKey: 'E_RESET_PASSWORD',
        flashAll: true,
      }
    )
  }
}
