import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { userManagementHttpLogger } from '../helpers/activity_log.js'
import { clearSessionToken, readSessionToken } from '../session/session_token.js'

export default class SignoutController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const sessionToken = readSessionToken(ctx)
    const isAnonymous = ctx.authSession?.user.isAnonymous ?? false
    const authLog = userManagementHttpLogger(ctx, {
      entityId: ctx.authSession?.user.id ?? 'anonymous',
      entityType: 'auth',
      metadata: { isAnonymous },
    })

    try {
      if (sessionToken) {
        await auth.signOut(sessionToken)
        authLog.success('sign_out_success')
      } else {
        authLog.warn('sign_out_missing_session', {
          entityId: 'authentication',
        })
      }
    } catch (error) {
      authLog.failure('sign_out_failure', error, { level: 'error' })
    }

    clearSessionToken(ctx)
    authLog.success('session_cookie_cleared')
    return ctx.response.redirect('/')
  }
}
