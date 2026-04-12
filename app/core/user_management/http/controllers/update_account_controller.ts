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
    const { name } = await ctx.request.validateUsing(updateProfileValidator)
    const sessionToken = readSessionToken(ctx)

    try {
      if (!sessionToken) {
        throw new SessionExpiredError()
      }

      await auth.updateUser(sessionToken, { name })
      ctx.logger.info({ name }, 'Profile updated')
      ctx.session.flash('success', 'Profile updated successfully.')
      return ctx.response.redirect().back()
    } catch (error) {
      return presentAuthError(ctx, error as Error, 'E_UPDATE_PROFILE')
    }
  }
}
