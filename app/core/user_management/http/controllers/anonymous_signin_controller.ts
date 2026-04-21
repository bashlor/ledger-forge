import type { HttpContext } from '@adonisjs/core/http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { seedProvisionedWorkspaceDemoData } from '#core/user_management/application/demo_workspace_bootstrap'
import { provisionPersonalWorkspace } from '#core/user_management/application/workspace_provisioning'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'

import { AuthenticationPort } from '../../domain/authentication.js'
import { userManagementHttpLogger } from '../helpers/activity_log.js'
import { writeSessionToken } from '../session/session_token.js'

export default class AnonymousSigninController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const authLog = userManagementHttpLogger(ctx)

    try {
      const authentication = await authLog.run(() => auth.signInAnonymously(), {
        failure: {
          entityId: 'authentication',
          entityType: 'auth',
          event: 'anonymous_sign_in_failure',
        },
        success: (result) => ({
          entityId: result.user.id,
          entityType: 'user',
          event: 'anonymous_sign_in_success',
        }),
      })

      try {
        const db = (await app.container.make('drizzle')) as PostgresJsDatabase<typeof schema>
        const provisioning = await provisionPersonalWorkspace(db, {
          isAnonymous: true,
          sessionToken: authentication.session.token,
          userId: authentication.user.id,
        })
        await seedProvisionedWorkspaceDemoData(db, provisioning)
      } catch (error) {
        ctx.logger.warn({ err: error }, 'workspace_provision_on_anonymous_signin_failed')
      }

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
