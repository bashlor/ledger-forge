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
import { signupValidator } from '../validators/user.js'

export default class SignupController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { email, fullName, password } = await ctx.request.validateUsing(signupValidator)
    const authLog = userManagementHttpLogger(ctx)

    return runInertiaFormMutation(
      ctx,
      async () => {
        const authentication = await authLog.run(
          () => auth.signUp(email, password, fullName ?? undefined),
          {
            failure: {
              entityId: 'authentication',
              entityType: 'auth',
              event: 'sign_up_failure',
            },
            success: (result) => ({
              entityId: result.user.id,
              entityType: 'user',
              event: 'sign_up_success',
            }),
          }
        )

        try {
          if (!isSingleTenantMode()) {
            const db = (await app.container.make('drizzle')) as PostgresJsDatabase<typeof schema>
            const provisioning = await provisionPersonalWorkspace(db, {
              displayName: fullName ?? undefined,
              email,
              isAnonymous: false,
              sessionToken: authentication.session.token,
              userId: authentication.user.id,
            })
            await seedProvisionedWorkspaceDemoData(db, provisioning)
          }
        } catch (error) {
          // Best-effort side-effect: account creation should still succeed.
          authLog.failure('workspace_provision_on_signup_failure', error, {
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
      { errorKey: 'E_SIGNUP_ERROR', flashAll: true }
    )
  }
}
