import type * as schema from '#core/common/drizzle/index'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  clearActiveOrganizationForSession,
  loadWorkspaceShare,
  provisionPersonalWorkspace,
} from '#core/user_management/application/workspace_provisioning'
import { userIsMemberOfOrganization } from '#core/user_management/support/tenant_membership'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'

import { AuthenticationPort } from '../../domain/authentication.js'
import { readSessionToken } from '../session/session_token.js'
import '../types/workspace_context.js'

/**
 * Loads the active workspace for Inertia and ensures a personal workspace exists
 * for signed-in users on every surface except the guest auth pages (sign-in /
 * sign-up flows).
 */
@inject()
export default class WorkspaceShareMiddleware {
  constructor(protected auth: AuthenticationPort) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const pathname = this.normalizePathname(ctx)

    if (!ctx.authSession) {
      ctx.workspaceShare = undefined
      return next()
    }

    if (this.isGuestAuthSurfacePath(pathname)) {
      ctx.workspaceShare = undefined
      return next()
    }

    const token = readSessionToken(ctx)
    const db = (await app.container.make('drizzle')) as PostgresJsDatabase<typeof schema>

    if (!ctx.authSession.session.activeOrganizationId && token) {
      try {
        await provisionPersonalWorkspace(db, {
          displayName: ctx.authSession.user.name ?? undefined,
          email: ctx.authSession.user.email,
          isAnonymous: ctx.authSession.user.isAnonymous,
          sessionToken: token,
          userId: ctx.authSession.user.id,
        })

        const refreshed = await this.auth.getSession(token)
        if (refreshed) {
          ctx.authSession = refreshed
        }
      } catch (error) {
        ctx.logger.debug({ err: error }, 'workspace_provision_failed')
      }
    }

    if (ctx.authSession.session.activeOrganizationId && token) {
      const hasMembership = await userIsMemberOfOrganization(
        db,
        ctx.authSession.user.id,
        ctx.authSession.session.activeOrganizationId
      )

      if (!hasMembership) {
        ctx.logger.warn(
          {
            organizationId: ctx.authSession.session.activeOrganizationId,
            path: pathname,
            userId: ctx.authSession.user.id,
          },
          'workspace_membership_missing_for_active_organization'
        )

        await clearActiveOrganizationForSession(db, token)

        const refreshed = await this.auth.getSession(token)
        if (refreshed) {
          ctx.authSession = refreshed
        } else if (ctx.authSession) {
          ctx.authSession = {
            ...ctx.authSession,
            session: { ...ctx.authSession.session, activeOrganizationId: null },
          }
        }
      }
    }

    if (!ctx.authSession.session.activeOrganizationId) {
      if (app.nodeEnvironment === 'test' || this.isBetterAuthPath(pathname)) {
        ctx.workspaceShare = undefined
        return next()
      }
      ctx.logger.warn(
        { path: pathname },
        'workspace_ensure_failed: authenticated session without active organization'
      )
      return ctx.response.redirect('/signin')
    }

    await this.attachWorkspaceShare(ctx)
    return next()
  }

  private async attachWorkspaceShare(ctx: HttpContext): Promise<void> {
    const activeOrganizationId = ctx.authSession?.session.activeOrganizationId
    if (!activeOrganizationId) {
      ctx.workspaceShare = undefined
      return
    }

    const db = (await app.container.make('drizzle')) as PostgresJsDatabase<typeof schema>
    try {
      const share = await loadWorkspaceShare(db, activeOrganizationId)
      ctx.workspaceShare = share ?? undefined
    } catch (error) {
      ctx.logger.debug({ err: error }, 'workspace_share_load_failed')
      ctx.workspaceShare = undefined
    }
  }

  private isBetterAuthPath(pathname: string): boolean {
    return pathname.startsWith('/api/auth')
  }

  private isGuestAuthSurfacePath(pathname: string): boolean {
    return pathname === '/signin' || pathname === '/signup' || pathname === '/signin/anonymous'
  }

  private normalizePathname(ctx: HttpContext): string {
    const raw = ctx.request.url(true)
    let path = raw.split('?')[0] ?? '/'
    if (!path.startsWith('/')) {
      path = `/${path}`
    }
    path = path.replace(/\/+$/, '') || '/'
    return path
  }
}
