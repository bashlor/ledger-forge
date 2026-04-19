import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { writeSessionToken } from '../session/session_token.js'

export default class AnonymousSigninController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    try {
      const authentication = await auth.signInAnonymously()

      writeSessionToken(ctx, {
        expiresAt: authentication.session.expiresAt,
        token: authentication.session.token,
      })

      return ctx.response.redirect('/dashboard')
    } catch (error) {
      return presentPublicError(ctx, error, { flashAll: true })
    }
  }
}
