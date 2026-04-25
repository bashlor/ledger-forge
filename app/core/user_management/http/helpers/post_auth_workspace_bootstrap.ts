import type * as schema from '#core/common/drizzle/index'
import type { HttpContext } from '@adonisjs/core/http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { seedProvisionedWorkspaceDemoData } from '#core/user_management/application/demo_workspace_bootstrap'
import { provisionPersonalWorkspace } from '#core/user_management/application/workspace_provisioning'
import { isSingleTenantMode } from '#core/user_management/support/tenant_mode'
import app from '@adonisjs/core/services/app'

import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '../../support/activity_log.js'

export type PostAuthWorkspaceFailureEvent =
  | 'workspace_provision_on_anonymous_signin_failure'
  | 'workspace_provision_on_signin_failure'
  | 'workspace_provision_on_signup_failure'

/**
 * Best-effort personal workspace + demo data after sign-in / sign-up. Failures
 * are logged; callers should not block session establishment.
 */
export async function tryProvisionWorkspaceAfterAuth(
  ctx: HttpContext,
  input: {
    displayName?: string
    email?: string
    isAnonymous: boolean
    sessionToken: string
    userId: string
  },
  activeOrganizationId: null | string,
  failureEvent: PostAuthWorkspaceFailureEvent
): Promise<void> {
  try {
    if (isSingleTenantMode()) {
      return
    }
    const db = (await app.container.make('drizzle')) as PostgresJsDatabase<typeof schema>
    const provisioning = await provisionPersonalWorkspace(db, {
      displayName: input.displayName,
      email: input.email,
      isAnonymous: input.isAnonymous,
      sessionToken: input.sessionToken,
      userId: input.userId,
    })
    await seedProvisionedWorkspaceDemoData(db, provisioning)
  } catch (error) {
    recordUserManagementActivityEvent(
      {
        entityId: input.userId,
        entityType: 'user',
        event: failureEvent,
        level: 'warn',
        metadata: {
          errorName: error instanceof Error ? error.name : 'UnknownError',
          phase: 'workspace_provision',
        },
        outcome: 'failure',
        tenantId: activeOrganizationId,
        userId: input.userId,
      },
      new StructuredUserManagementActivitySink(ctx.logger)
    )
  }
}
