import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { resetPasswordValidator } from '../validators/user.js'

export default class ResetPasswordController {
  async show({ inertia, request }: HttpContext) {
    const token = request.qs().token as string | undefined
    return inertia.render('auth/reset-password', { token: token ?? '' })
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { newPassword, token } = await ctx.request.validateUsing(resetPasswordValidator)

    try {
      ctx.logger.info('Password reset attempt')
      await auth.resetPassword(token, newPassword)
      ctx.logger.info('Password reset success')
      ctx.session.flash('success', 'Your password has been reset. You can now log in.')
      return ctx.response.redirect('/signin')
    } catch (error) {
      return presentPublicError(ctx, error, { errorKey: 'E_RESET_PASSWORD', flashAll: true })
    }
  }
}
