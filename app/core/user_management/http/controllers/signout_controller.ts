import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { clearSessionToken, readSessionToken } from '../session/session_token.js'

export default class SignoutController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const sessionToken = readSessionToken(ctx)
    const isAnonymous = ctx.authSession?.user.isAnonymous ?? false

    try {
      if (sessionToken) {
        await auth.signOut(sessionToken)
        ctx.logger.info({ isAnonymous }, 'Better Auth signOut succeeded')
      } else {
        ctx.logger.warn('Signout: no session token found in cookie')
      }
    } catch (error) {
      ctx.logger.error({ err: error, isAnonymous }, 'Signout error from Better Auth')
    }

    clearSessionToken(ctx)
    ctx.logger.info({ isAnonymous }, 'Session cookie cleared, redirecting to /')
    return ctx.response.redirect('/')
  }
}
