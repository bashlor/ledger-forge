import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { SessionExpiredError } from '../../domain/errors.js'
import { presentAuthError } from '../presenters/auth_error_presenter.js'
import { readSessionToken } from '../session/session_token.js'
import { changePasswordValidator } from '../validators/user.js'

export default class UpdatePasswordController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    if (ctx.authSession?.user.isAnonymous) {
      ctx.logger.warn(
        { userId: ctx.authSession.user.id },
        'Anonymous user attempted password change — rejected'
      )
      return ctx.response.forbidden('Password change is not available for anonymous accounts.')
    }

    const { currentPassword, newPassword } =
      await ctx.request.validateUsing(changePasswordValidator)
    const sessionToken = readSessionToken(ctx)

    try {
      if (!sessionToken) {
        throw new SessionExpiredError()
      }

      await auth.changePassword(sessionToken, currentPassword, newPassword)
      ctx.logger.info('Password changed successfully')
      ctx.session.flash('success', 'Password changed successfully.')
      return ctx.response.redirect().toPath(ctx.request.url())
    } catch (error) {
      return presentAuthError(ctx, error as Error, 'E_CHANGE_PASSWORD')
    }
  }
}
