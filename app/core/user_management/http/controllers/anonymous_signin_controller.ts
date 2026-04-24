import type { HttpContext } from '@adonisjs/core/http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { seedProvisionedWorkspaceDemoData } from '#core/user_management/application/demo_workspace_bootstrap'
import { provisionPersonalWorkspace } from '#core/user_management/application/workspace_provisioning'
import { isSingleTenantMode } from '#core/user_management/support/tenant_mode'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'

import { AuthenticationPort } from '../../domain/authentication.js'
import { userManagementHttpLogger } from '../helpers/activity_log.js'
import { runInertiaFormMutation } from '../helpers/error_surface.js'
import { writeSessionToken } from '../session/session_token.js'

export default class AnonymousSigninController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const authLog = userManagementHttpLogger(ctx)

    return runInertiaFormMutation(
      ctx,
      async () => {
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
          if (!isSingleTenantMode()) {
            const db = (await app.container.make('drizzle')) as PostgresJsDatabase<typeof schema>
            const provisioning = await provisionPersonalWorkspace(db, {
              isAnonymous: true,
              sessionToken: authentication.session.token,
              userId: authentication.user.id,
            })
            await seedProvisionedWorkspaceDemoData(db, provisioning)
          }
        } catch (error) {
          // Best-effort side-effect: anonymous sign-in should still complete.
          authLog.failure('workspace_provision_on_anonymous_signin_failure', error, {
            entityId: authentication.user.id,
            entityType: 'user',
            metadata: { phase: 'workspace_provision' },
          })
        }

        writeSessionToken(ctx, {
          expiresAt: authentication.session.expiresAt,
          token: authentication.session.token,
        })

        return ctx.response.redirect('/dashboard')
      },
      { flashAll: true }
    )
  }
}
