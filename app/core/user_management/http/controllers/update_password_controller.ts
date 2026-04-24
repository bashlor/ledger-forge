import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { SessionExpiredError } from '../../domain/errors.js'
import { userManagementHttpLogger } from '../helpers/activity_log.js'
import { runInertiaFormMutation } from '../helpers/error_surface.js'
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
    const authLog = userManagementHttpLogger(ctx, {
      entityId: ctx.authSession?.user.id ?? 'authentication',
    })

    return runInertiaFormMutation(
      ctx,
      async () => {
        if (!sessionToken) {
          throw new SessionExpiredError()
        }

        await authLog.run(() => auth.changePassword(sessionToken, currentPassword, newPassword), {
          failure: {
            entityType: 'auth',
            event: 'password_change_failure',
          },
          success: {
            entityType: 'user',
            event: 'password_change_success',
          },
        })
        ctx.session.flash('success', 'Password changed successfully.')
        return ctx.response.redirect().toPath('/account')
      },
      {
        errorKey: 'E_CHANGE_PASSWORD',
        flashAll: true,
        redirectTo: '/account',
      }
    )
  }
}
