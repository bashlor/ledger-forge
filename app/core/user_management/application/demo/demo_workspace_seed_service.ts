import type * as schema from '#core/common/drizzle/index'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { seedProvisionedWorkspaceDemoData } from '#core/user_management/application/demo_workspace_bootstrap'
import {
  recordUserManagementActivityEvent,
  type UserManagementActivitySink,
} from '#core/user_management/support/activity_log'

import type { WorkspaceProvisioningResult } from '../workspace_provisioning.js'

export type DemoWorkspaceSeedMode = 'personal' | 'single'

export class DemoWorkspaceSeedService {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async seed(provisioning: WorkspaceProvisioningResult): Promise<boolean> {
    return this.seedProvisionedWorkspaceDemoData(provisioning)
  }

  async seedBestEffort(input: {
    activitySink?: UserManagementActivitySink
    mode: DemoWorkspaceSeedMode
    path: string
    provisioning: WorkspaceProvisioningResult
    userId: null | string
  }): Promise<boolean> {
    try {
      return await this.seed(input.provisioning)
    } catch (error) {
      recordUserManagementActivityEvent(
        {
          entityId: input.provisioning.organizationId ?? 'unknown',
          entityType: 'workspace',
          event: `${input.mode}_workspace_demo_seed_failure`,
          level: 'warn',
          metadata: {
            errorName: error instanceof Error ? error.name : 'UnknownError',
            mode: input.mode,
            orgId: input.provisioning.organizationId,
            path: input.path,
          },
          outcome: 'failure',
          tenantId: input.provisioning.organizationId,
          userId: input.userId,
        },
        input.activitySink
      )
      return false
    }
  }

  protected async seedProvisionedWorkspaceDemoData(
    provisioning: WorkspaceProvisioningResult
  ): Promise<boolean> {
    return seedProvisionedWorkspaceDemoData(this.db, provisioning)
  }
}
