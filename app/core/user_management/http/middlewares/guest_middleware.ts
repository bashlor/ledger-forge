import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { readSessionToken } from '../session/session_token.js'

@inject()
export default class GuestMiddleware {
  redirectTo = '/dashboard'

  constructor(protected auth: AuthenticationPort) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const session = await this.auth.getSession(readSessionToken(ctx))

    if (session) {
      ctx.session.reflash()
      return ctx.response.redirect(this.redirectTo, true)
    }

    return next()
  }
}
