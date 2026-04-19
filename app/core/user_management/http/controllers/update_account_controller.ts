import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { SessionExpiredError } from '../../domain/errors.js'
import { presentAuthError } from '../presenters/auth_error_presenter.js'
import { readSessionToken } from '../session/session_token.js'
import { updateProfileValidator } from '../validators/user.js'

export default class UpdateAccountController {
  async show({ authSession, inertia }: HttpContext) {
    const user = authSession?.user
    return inertia.render('account/settings', {
      user: user ? { email: user.email, image: user.image ?? null, name: user.name } : null,
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

    try {
      if (!sessionToken) {
        throw new SessionExpiredError()
      }

      await auth.updateUser(sessionToken, { name })
      ctx.logger.info('Profile updated')
      ctx.session.flash('success', 'Profile updated successfully.')
      return ctx.response.redirect().toPath(ctx.request.url())
    } catch (error) {
      return presentAuthError(ctx, error as Error, 'E_UPDATE_PROFILE')
    }
  }
}

function rejectAnonymousAccountMutation(ctx: HttpContext, message: string) {
  ctx.logger.warn({ isAnonymous: true }, 'Anonymous account mutation rejected')
  ctx.session.flashAll()
  ctx.session.flash('notification', { message, type: 'error' })
  return ctx.response.redirect().toPath(ctx.request.url())
}
