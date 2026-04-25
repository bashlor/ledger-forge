import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import {
  ActiveTenantRequiredError,
  resolveActiveTenantContext,
} from '#core/user_management/application/active_tenant_context'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '#core/user_management/support/activity_log'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'

import { clearActiveOrganizationForSession } from '../../application/workspace_provisioning.js'
import { readSessionToken } from '../session/session_token.js'

/**
 * Requires an active organization (tenant) and active membership on the session.
 * Must run after {@link AuthMiddleware} (which populates ctx.authSession).
 *
 * Redirects to '/' when no tenant is active — WorkspaceShareMiddleware will
 * have already cleared activeOrganizationId if the user is no longer a member.
 */
@inject()
export default class EnsureActiveTenantMiddleware {
  redirectTo = '/'

  constructor(private readonly authorizationService: AuthorizationService) {}

  async handle(ctx: HttpContext, next: NextFn) {
    if (!ctx.authSession?.session.activeOrganizationId) {
      return ctx.response.redirect(this.redirectTo)
    }

    try {
      await resolveActiveTenantContext(ctx.authSession, this.authorizationService)
    } catch (error) {
      if (error instanceof ActiveTenantRequiredError) {
        return ctx.response.redirect(this.redirectTo)
      }

      await this.clearStaleActiveTenant(ctx)
      throw error
    }

    return next()
  }

  private async clearStaleActiveTenant(ctx: HttpContext): Promise<void> {
    const sessionToken = readSessionToken(ctx)
    const activeOrganizationId = ctx.authSession?.session.activeOrganizationId ?? null

    if (!sessionToken || !activeOrganizationId) {
      return
    }

    try {
      const db = (await app.container.make('drizzle')) as PostgresJsDatabase<typeof schema>
      await clearActiveOrganizationForSession(db, sessionToken)
      ctx.authSession = {
        ...ctx.authSession!,
        session: { ...ctx.authSession!.session, activeOrganizationId: null },
      }
      recordUserManagementActivityEvent(
        {
          entityId: activeOrganizationId,
          entityType: 'workspace',
          event: 'active_tenant_membership_invalid_cleared',
          level: 'warn',
          metadata: { source: 'ensure_active_tenant' },
          outcome: 'failure',
          tenantId: activeOrganizationId,
          userId: ctx.authSession.user.id,
        },
        new StructuredUserManagementActivitySink(ctx.logger)
      )
    } catch (clearError) {
      recordUserManagementActivityEvent(
        {
          entityId: activeOrganizationId,
          entityType: 'workspace',
          event: 'active_tenant_membership_invalid_clear_failed',
          level: 'error',
          metadata: {
            errorName: clearError instanceof Error ? clearError.name : 'UnknownError',
            source: 'ensure_active_tenant',
          },
          outcome: 'failure',
          tenantId: activeOrganizationId,
          userId: ctx.authSession?.user.id ?? null,
        },
        new StructuredUserManagementActivitySink(ctx.logger)
      )
    }
  }
}
