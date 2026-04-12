import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { clearSessionToken, readSessionToken } from '../session/session_token.js'

export default class SignoutController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    ctx.logger.info('Logout attempt')

    try {
      const sessionToken = readSessionToken(ctx)
      if (sessionToken) {
        await auth.signOut(sessionToken)
      }
    } catch (error) {
      ctx.logger.error({ err: error }, 'Logout error')
    }

    clearSessionToken(ctx)
    ctx.logger.info('Logout success')
    return ctx.response.redirect('/')
  }
}
