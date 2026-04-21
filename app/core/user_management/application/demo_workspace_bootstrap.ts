import type * as schema from '#core/common/drizzle/index'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { systemAccessContext } from '#core/accounting/application/support/access_context'

import type { WorkspaceProvisioningResult } from './workspace_provisioning.js'

import { DemoModeService } from './demo_mode_service.js'

export async function seedProvisionedWorkspaceDemoData(
  db: PostgresJsDatabase<typeof schema>,
  provisioning: WorkspaceProvisioningResult,
  demoMode = new DemoModeService()
): Promise<boolean> {
  if (!demoMode.isEnabled() || !provisioning.wasProvisioned || !provisioning.organizationId) {
    return false
  }

  return new DemoDatasetService(db).seedTenantIfEmpty(
    systemAccessContext(provisioning.organizationId, 'demo-workspace-bootstrap')
  )
}
