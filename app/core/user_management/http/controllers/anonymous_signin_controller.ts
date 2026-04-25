import type { HttpContext } from '@adonisjs/core/http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { seedProvisionedWorkspaceDemoData } from '#core/user_management/application/demo_workspace_bootstrap'
import { provisionPersonalWorkspace } from '#core/user_management/application/workspace_provisioning'
import { isSingleTenantMode } from '#core/user_management/support/tenant_mode'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'

import { AuthenticationPort } from '../../domain/authentication.js'
import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '../../support/activity_log.js'
import { resolveInertiaMutation } from '../helpers/error_surface.js'
import { writeSessionToken } from '../session/session_token.js'

export default class AnonymousSigninController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    return resolveInertiaMutation(ctx, {
      action: async () => {
        const authentication = await auth.signInAnonymously()

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
          recordUserManagementActivityEvent(
            {
              entityId: authentication.user.id,
              entityType: 'user',
              event: 'workspace_provision_on_anonymous_signin_failure',
              level: 'warn',
              metadata: {
                errorName: error instanceof Error ? error.name : 'UnknownError',
                phase: 'workspace_provision',
              },
              outcome: 'failure',
              tenantId: authentication.session.activeOrganizationId ?? null,
              userId: authentication.user.id,
            },
            new StructuredUserManagementActivitySink(ctx.logger)
          )
        }

        writeSessionToken(ctx, {
          expiresAt: authentication.session.expiresAt,
          token: authentication.session.token,
        })
      },
      flashAll: true,
      redirectTo: '/dashboard',
    })
  }
}
