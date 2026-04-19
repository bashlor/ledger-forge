import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { SessionExpiredError } from '../../domain/errors.js'
import { rejectAnonymousAccountMutation } from '../helpers/reject_anonymous_account_mutation.js'
import { readSessionToken } from '../session/session_token.js'
import { changePasswordValidator } from '../validators/user.js'

export default class UpdatePasswordController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    if (ctx.authSession?.user.isAnonymous) {
      return rejectAnonymousAccountMutation(
        ctx,
        'Password changes are not available for anonymous accounts.',
        { redirectTo: '/account' }
      )
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
      return ctx.response.redirect().toPath('/account')
    } catch (error) {
      return presentPublicError(ctx, error, {
        errorKey: 'E_CHANGE_PASSWORD',
        flashAll: true,
        redirectTo: '/account',
      })
    }
  }
}
