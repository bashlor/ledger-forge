import type * as schema from '#core/common/drizzle/index'
import type { WorkspaceProvisioningResult } from '#core/user_management/application/workspace_provisioning'
import type { UserManagementActivityEvent } from '#core/user_management/support/activity_log'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { test } from '@japa/runner'

import { DemoWorkspaceSeedService } from './demo_workspace_seed_service.js'

type AppDrizzleDb = PostgresJsDatabase<typeof schema>

class DemoWorkspaceSeedServiceStub extends DemoWorkspaceSeedService {
  constructor(private readonly result: boolean | Error) {
    super({} as AppDrizzleDb)
  }

  protected override async seedProvisionedWorkspaceDemoData(): Promise<boolean> {
    if (this.result instanceof Error) {
      throw this.result
    }

    return this.result
  }
}

test.group('DemoWorkspaceSeedService', () => {
  test('records seed failures without blocking callers', async ({ assert }) => {
    const events: UserManagementActivityEvent[] = []
    const service = new DemoWorkspaceSeedServiceStub(new Error('seed exploded'))
    const provisioning: WorkspaceProvisioningResult = {
      organizationId: 'org-demo',
      wasProvisioned: true,
    }

    const seeded = await service.seedBestEffort({
      activitySink: {
        record(event) {
          events.push(event)
        },
      },
      mode: 'personal',
      path: '/dashboard',
      provisioning,
      userId: 'user-1',
    })

    assert.isFalse(seeded)
    assert.lengthOf(events, 1)
    assert.deepInclude(events[0]!, {
      entityId: 'org-demo',
      entityType: 'workspace',
      event: 'personal_workspace_demo_seed_failure',
      level: 'warn',
      outcome: 'failure',
      tenantId: 'org-demo',
      userId: 'user-1',
    })
  })
})
