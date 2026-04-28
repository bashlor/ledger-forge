import type * as schema from '#core/common/drizzle/index'
import type { AuthResult } from '#core/user_management/domain/authentication'
import type { AuthenticationPort } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  clearActiveOrganizationForSession,
  loadWorkspaceShare,
  provisionPersonalWorkspace,
  type WorkspaceProvisioningResult,
  type WorkspaceShareProps,
} from '#core/user_management/application/workspace_provisioning'
import {
  recordUserManagementActivityEvent,
  type UserManagementActivitySink,
} from '#core/user_management/support/activity_log'

import { DemoWorkspaceSeedService } from './demo_workspace_seed_service.js'

export class AnonymousDemoWorkspaceService {
  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly demoSeedService = new DemoWorkspaceSeedService(db)
  ) {}

  async ensureWorkspace(input: {
    activitySink?: UserManagementActivitySink
    auth: Pick<AuthenticationPort, 'getSession'>
    authSession: AuthResult
    path: string
    sessionToken: null | string
  }): Promise<AuthResult> {
    let authSession = input.authSession

    try {
      if (authSession.session.activeOrganizationId) {
        const activeOrganizationId = authSession.session.activeOrganizationId
        const activeWorkspace = await this.loadWorkspaceShare(activeOrganizationId)

        if (activeWorkspace?.isAnonymousWorkspace) {
          return authSession
        }

        if (input.sessionToken) {
          await this.clearActiveOrganizationForSession(input.sessionToken)
          authSession = await this.refreshSession(input.auth, input.sessionToken, authSession, null)
        }
      }

      if (!input.sessionToken || authSession.session.activeOrganizationId) {
        return authSession
      }

      const provisioning = await this.provisionPersonalWorkspace({
        isAnonymous: true,
        sessionToken: input.sessionToken,
        userId: authSession.user.id,
      })

      authSession = await this.refreshSession(
        input.auth,
        input.sessionToken,
        authSession,
        provisioning.organizationId ?? null
      )

      await this.seedDemoWorkspace({
        activitySink: input.activitySink,
        mode: 'personal',
        path: input.path,
        provisioning,
        userId: authSession.user.id,
      })

      return authSession
    } catch (error) {
      recordUserManagementActivityEvent(
        {
          entityId: authSession.session.activeOrganizationId ?? 'unknown',
          entityType: 'workspace',
          event: 'personal_workspace_provision_failure',
          level: 'debug',
          metadata: {
            errorName: error instanceof Error ? error.name : 'UnknownError',
            mode: 'personal',
            orgId: authSession.session.activeOrganizationId,
            path: input.path,
          },
          outcome: 'failure',
          tenantId: authSession.session.activeOrganizationId,
          userId: authSession.user.id,
        },
        input.activitySink
      )
      return authSession
    }
  }

  protected async clearActiveOrganizationForSession(sessionToken: string): Promise<void> {
    await clearActiveOrganizationForSession(this.db, sessionToken)
  }

  protected async loadWorkspaceShare(organizationId: string): Promise<null | WorkspaceShareProps> {
    return loadWorkspaceShare(this.db, organizationId)
  }

  protected async provisionPersonalWorkspace(input: {
    isAnonymous: true
    sessionToken: string
    userId: string
  }): Promise<WorkspaceProvisioningResult> {
    return provisionPersonalWorkspace(this.db, input)
  }

  protected async seedDemoWorkspace(input: {
    activitySink?: UserManagementActivitySink
    mode: 'personal'
    path: string
    provisioning: WorkspaceProvisioningResult
    userId: null | string
  }): Promise<boolean> {
    return this.demoSeedService.seedBestEffort(input)
  }

  private async refreshSession(
    auth: Pick<AuthenticationPort, 'getSession'>,
    sessionToken: string,
    fallback: AuthResult,
    activeOrganizationId?: null | string
  ): Promise<AuthResult> {
    const refreshed = await auth.getSession(sessionToken)
    if (refreshed) {
      return refreshed
    }

    if (activeOrganizationId !== undefined) {
      return {
        ...fallback,
        session: { ...fallback.session, activeOrganizationId },
      }
    }

    return fallback
  }
}
