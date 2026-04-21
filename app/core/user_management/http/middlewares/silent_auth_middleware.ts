import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import app from '@adonisjs/core/services/app'

import { AuthenticationPort } from '../../domain/authentication.js'
import { readSessionToken } from '../session/session_token.js'

export default class SilentAuthMiddleware {
  constructor(private readonly authOverride: AuthenticationPort | null = null) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const auth = this.authOverride ?? (await app.container.make(AuthenticationPort))
    const result = await auth.getSession(readSessionToken(ctx))

    if (result) {
      ctx.authSession = result
    }

    return next()
  }
}
