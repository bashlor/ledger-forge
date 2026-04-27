import type * as schema from '#core/common/drizzle/index'
import type { HttpContext } from '@adonisjs/core/http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DemoWorkspaceSeedService } from '#core/user_management/application/demo/demo_workspace_seed_service'
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

export async function tryProvisionAnonymousDemoWorkspaceAfterAuth(
  ctx: HttpContext,
  input: {
    sessionToken: string
    userId: string
  },
  activeOrganizationId: null | string,
  failureEvent: PostAuthWorkspaceFailureEvent
): Promise<void> {
  await tryProvisionPersonalWorkspaceAfterAuth(
    ctx,
    {
      isAnonymous: true,
      sessionToken: input.sessionToken,
      userId: input.userId,
    },
    activeOrganizationId,
    failureEvent
  )
}

/**
 * Best-effort normal personal workspace bootstrap after named sign-in / sign-up.
 * Single-tenant named users are resolved by WorkspaceShareMiddleware.
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
  if (isSingleTenantMode()) {
    return
  }

  await tryProvisionPersonalWorkspaceAfterAuth(ctx, input, activeOrganizationId, failureEvent)
}

async function tryProvisionPersonalWorkspaceAfterAuth(
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
    const db = (await app.container.make('drizzle')) as PostgresJsDatabase<typeof schema>
    const provisioning = await provisionPersonalWorkspace(db, {
      displayName: input.displayName,
      email: input.email,
      isAnonymous: input.isAnonymous,
      sessionToken: input.sessionToken,
      userId: input.userId,
    })
    await new DemoWorkspaceSeedService(db).seedBestEffort({
      activitySink: new StructuredUserManagementActivitySink(ctx.logger),
      mode: 'personal',
      path: ctx.request.url(true),
      provisioning,
      userId: input.userId,
    })
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
