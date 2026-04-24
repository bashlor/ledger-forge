import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { readSessionToken } from '../session/session_token.js'

@inject()
export default class AuthMiddleware {
  redirectTo = '/signin'

  constructor(protected auth: AuthenticationPort) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const result = ctx.authSession ?? (await this.auth.getSession(readSessionToken(ctx)))

    if (!result) {
      return ctx.response.redirect(this.redirectTo)
    }

    ctx.authSession = result

    return next()
  }
}
