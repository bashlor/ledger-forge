import type { HttpContext } from '@adonisjs/core/http'

import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { SessionExpiredError } from '../../domain/errors.js'
import { resolveInertiaMutation } from '../helpers/error_surface.js'
import { rejectAnonymousAccountMutation } from '../helpers/reject_anonymous_account_mutation.js'
import { readSessionToken } from '../session/session_token.js'
import { updateProfileValidator } from '../validators/user.js'

export default class UpdateAccountController {
  @inject()
  async show({ authSession, inertia }: HttpContext, authorizationService: AuthorizationService) {
    const actor = authSession?.session.activeOrganizationId
      ? await authorizationService.actorFromSession(authSession)
      : null

    return inertia.render('account/settings', {
      activeWorkspaceRole: actor?.membershipIsActive ? actor.membershipRole : null,
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

    return resolveInertiaMutation(ctx, {
      action: async () => {
        if (!sessionToken) {
          throw new SessionExpiredError()
        }

        await auth.updateUser(sessionToken, { name })
      },
      errorKey: 'E_UPDATE_PROFILE',
      flashAll: true,
      successMessage: 'Profile updated successfully.',
    })
  }
}
