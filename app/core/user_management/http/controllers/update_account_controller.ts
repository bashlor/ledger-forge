import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { SessionExpiredError } from '../../domain/errors.js'
import { userManagementHttpLogger } from '../helpers/activity_log.js'
import { rejectAnonymousAccountMutation } from '../helpers/reject_anonymous_account_mutation.js'
import { readSessionToken } from '../session/session_token.js'
import { updateProfileValidator } from '../validators/user.js'

export default class UpdateAccountController {
  async show({ authSession, inertia }: HttpContext) {
    const user = authSession?.user
    return inertia.render('account/settings', {
      user: user
        ? {
            email: user.email,
            image: user.image ?? null,
            isAnonymous: user.isAnonymous,
            name: user.name,
          }
        : null,
    })
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    if (ctx.authSession?.user.isAnonymous) {
      return rejectAnonymousAccountMutation(
        ctx,
        'Profile updates are not available for anonymous accounts.'
      )
    }

    const { name } = await ctx.request.validateUsing(updateProfileValidator)
    const sessionToken = readSessionToken(ctx)
    const authLog = userManagementHttpLogger(ctx, {
      entityId: ctx.authSession?.user.id ?? 'unknown',
      entityType: 'user',
    })

    try {
      if (!sessionToken) {
        throw new SessionExpiredError()
      }

      await authLog.run(() => auth.updateUser(sessionToken, { name }), {
        failure: { event: 'profile_update_failure' },
        success: { event: 'profile_update_success' },
      })
      ctx.session.flash('success', 'Profile updated successfully.')
      return ctx.response.redirect().toPath(ctx.request.url())
    } catch (error) {
      return presentPublicError(ctx, error, {
        errorKey: 'E_UPDATE_PROFILE',
        flashAll: true,
      })
    }
  }
}
