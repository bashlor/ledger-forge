import type * as schema from '#core/common/drizzle/index'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { HttpProblem } from '#core/common/resources/http_problem'
import { seedProvisionedWorkspaceDemoData } from '#core/user_management/application/demo_workspace_bootstrap'
import {
  clearActiveOrganizationForSession,
  ensureSingleTenantMembership,
  loadWorkspaceShare,
  provisionPersonalWorkspace,
  setActiveOrganizationForSession,
} from '#core/user_management/application/workspace_provisioning'
import { userIsMemberOfOrganization } from '#core/user_management/support/tenant_membership'
import { getSingleTenantOrgId, isSingleTenantMode } from '#core/user_management/support/tenant_mode'
import app from '@adonisjs/core/services/app'

import { AuthenticationPort } from '../../domain/authentication.js'
import { userManagementHttpLogger } from '../helpers/activity_log.js'
import { readSessionToken } from '../session/session_token.js'
import '../types/workspace_context.js'

/**
 * Loads the active workspace for Inertia and ensures a personal workspace exists
 * for signed-in users on every surface except the guest auth pages (sign-in /
 * sign-up flows).
 */
export default class WorkspaceShareMiddleware {
  constructor(private readonly authOverride: AuthenticationPort | null = null) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const pathname = this.normalizePathname(ctx)
    const auth = this.authOverride ?? (await app.container.make(AuthenticationPort))

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
    const singleTenantMode = this.isSingleTenantMode()

    if (singleTenantMode) {
      try {
        const orgId = this.getSingleTenantOrgId()
        await this.ensureSingleTenantMembership(db, {
          displayName: ctx.authSession.user.name ?? undefined,
          email: ctx.authSession.user.email,
          isAnonymous: ctx.authSession.user.isAnonymous,
          orgId,
          userId: ctx.authSession.user.id,
        })

        if (token && ctx.authSession.session.activeOrganizationId !== orgId) {
          await setActiveOrganizationForSession(db, token, orgId)
        }

        this.setActiveOrganizationId(ctx, orgId)
      } catch (error) {
        this.setActiveOrganizationId(ctx, null)
        this.logSingleTenantResolutionFailure(ctx, pathname, error)
      }

      if (ctx.authSession?.session.activeOrganizationId) {
        await this.seedWorkspaceDemoDataBestEffort(ctx, db, pathname, 'single', {
          organizationId: ctx.authSession.session.activeOrganizationId,
          wasProvisioned: true,
        })
      }
    } else if (!ctx.authSession.session.activeOrganizationId && token) {
      try {
        const provisioning = await this.provisionPersonalWorkspace(db, {
          displayName: ctx.authSession.user.name ?? undefined,
          email: ctx.authSession.user.email,
          isAnonymous: ctx.authSession.user.isAnonymous,
          sessionToken: token,
          userId: ctx.authSession.user.id,
        })

        const refreshed = await auth.getSession(token)
        if (refreshed) {
          ctx.authSession = refreshed
        }

        await this.seedWorkspaceDemoDataBestEffort(ctx, db, pathname, 'personal', provisioning)
      } catch (error) {
        this.logPersonalWorkspaceProvisionFailure(ctx, pathname, error)
      }
    }

    if (ctx.authSession.session.activeOrganizationId && !singleTenantMode && token) {
      const hasMembership = await this.hasActiveTenantMembership(
        db,
        ctx.authSession.user.id,
        ctx.authSession.session.activeOrganizationId
      )

      if (!hasMembership) {
        this.createWorkspaceLogger(ctx).warn(
          'workspace_membership_missing_for_active_organization',
          {
            entityId: ctx.authSession.session.activeOrganizationId,
            metadata: {
              organizationId: ctx.authSession.session.activeOrganizationId,
              path: pathname,
            },
          }
        )

        await clearActiveOrganizationForSession(db, token)

        const refreshed = await auth.getSession(token)
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
      if (this.isBetterAuthPath(pathname)) {
        ctx.workspaceShare = undefined
        return next()
      }
      if (this.wantsJson(ctx)) {
        new HttpProblem(
          401,
          'Unauthorized',
          'An active workspace is required for this request.',
          'urn:accounting-app:error:active-workspace-required',
          undefined,
          { code: 'auth.active_workspace_required' }
        ).toResponse(ctx.response)
        return
      }
      if (app.nodeEnvironment === 'test') {
        ctx.workspaceShare = undefined
        return next()
      }
      this.createWorkspaceLogger(ctx).warn('workspace_ensure_failed_without_active_organization', {
        metadata: { path: pathname },
      })
      return ctx.response.redirect('/signin')
    }

    await this.attachWorkspaceShare(ctx)
    return next()
  }

  protected async ensureSingleTenantMembership(
    db: PostgresJsDatabase<typeof schema>,
    input: {
      displayName?: string
      email?: string
      isAnonymous: boolean
      orgId: string
      userId: string
    }
  ) {
    return ensureSingleTenantMembership(db, input)
  }

  protected getSingleTenantOrgId(): string {
    return getSingleTenantOrgId()
  }

  protected async hasActiveTenantMembership(
    db: PostgresJsDatabase<typeof schema>,
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    return userIsMemberOfOrganization(db, userId, organizationId)
  }

  protected isSingleTenantMode(): boolean {
    return isSingleTenantMode()
  }

  protected async provisionPersonalWorkspace(
    db: PostgresJsDatabase<typeof schema>,
    input: {
      displayName?: string
      email?: string
      isAnonymous: boolean
      sessionToken: string
      userId: string
    }
  ) {
    return provisionPersonalWorkspace(db, input)
  }

  protected async seedWorkspaceDemoData(
    db: PostgresJsDatabase<typeof schema>,
    provisioning: { organizationId: null | string; wasProvisioned: boolean }
  ): Promise<boolean> {
    return seedProvisionedWorkspaceDemoData(db, provisioning)
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
      this.createWorkspaceLogger(ctx).failure('workspace_share_load_failure', error, {
        entityId: activeOrganizationId,
        level: 'debug',
      })
      ctx.workspaceShare = undefined
    }
  }

  private createWorkspaceLogger(ctx: HttpContext) {
    return userManagementHttpLogger(ctx, {
      entityId: ctx.authSession?.session.activeOrganizationId ?? 'unknown',
      entityType: 'workspace',
    })
  }

  private isBetterAuthPath(pathname: string): boolean {
    return pathname.startsWith('/api/auth')
  }

  private isGuestAuthSurfacePath(pathname: string): boolean {
    return pathname === '/signin' || pathname === '/signup' || pathname === '/signin/anonymous'
  }

  private logPersonalWorkspaceProvisionFailure(
    ctx: HttpContext,
    pathname: string,
    error: unknown
  ): void {
    this.createWorkspaceLogger(ctx).failure('personal_workspace_provision_failure', error, {
      entityId: ctx.authSession?.session.activeOrganizationId ?? 'unknown',
      level: 'debug',
      metadata: {
        mode: 'personal',
        orgId: ctx.authSession?.session.activeOrganizationId,
        path: pathname,
      },
    })
  }

  private logSeedFailure(
    ctx: HttpContext,
    pathname: string,
    error: unknown,
    mode: 'personal' | 'single',
    organizationId: null | string
  ): void {
    this.createWorkspaceLogger(ctx).failure(`${mode}_workspace_demo_seed_failure`, error, {
      entityId: organizationId ?? 'unknown',
      level: 'warn',
      metadata: {
        mode,
        orgId: organizationId,
        path: pathname,
      },
    })
  }

  private logSingleTenantResolutionFailure(
    ctx: HttpContext,
    pathname: string,
    error: unknown
  ): void {
    const metadata = {
      mode: 'single',
      orgId: ctx.authSession?.session.activeOrganizationId,
      path: pathname,
    }

    if (error instanceof Error && error.message.includes('SINGLE_TENANT_ORG_ID')) {
      this.createWorkspaceLogger(ctx).failure('single_tenant_configuration_invalid', error, {
        entityId: ctx.authSession?.session.activeOrganizationId ?? 'unknown',
        level: 'error',
        metadata,
      })
      return
    }

    this.createWorkspaceLogger(ctx).failure('single_tenant_provision_failure', error, {
      entityId: ctx.authSession?.session.activeOrganizationId ?? 'unknown',
      level: 'warn',
      metadata,
    })
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

  private async seedWorkspaceDemoDataBestEffort(
    ctx: HttpContext,
    db: PostgresJsDatabase<typeof schema>,
    pathname: string,
    mode: 'personal' | 'single',
    provisioning: { organizationId: null | string; wasProvisioned: boolean }
  ): Promise<void> {
    try {
      await this.seedWorkspaceDemoData(db, provisioning)
    } catch (error) {
      this.logSeedFailure(ctx, pathname, error, mode, provisioning.organizationId)
    }
  }

  private setActiveOrganizationId(ctx: HttpContext, organizationId: null | string): void {
    if (!ctx.authSession) {
      return
    }

    ctx.authSession = {
      ...ctx.authSession,
      session: { ...ctx.authSession.session, activeOrganizationId: organizationId },
    }
  }

  private wantsJson(ctx: HttpContext): boolean {
    const accept = ctx.request.header('accept') ?? ''
    return accept.includes('application/json') || accept.includes('application/problem+json')
  }
}
