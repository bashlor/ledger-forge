import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { SessionExpiredError } from '../../domain/errors.js'
import { resolveInertiaMutation } from '../helpers/error_surface.js'
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

    return resolveInertiaMutation(ctx, {
      action: async () => {
        if (!sessionToken) {
          throw new SessionExpiredError()
        }

        await auth.changePassword(sessionToken, currentPassword, newPassword)
      },
      errorKey: 'E_CHANGE_PASSWORD',
      errorRedirectTo: '/account',
      flashAll: true,
      redirectTo: '/account',
      successMessage: 'Password changed successfully.',
    })
  }
}
