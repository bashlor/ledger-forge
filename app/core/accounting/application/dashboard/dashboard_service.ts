import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingServiceDependencies } from '#core/accounting/application/support/service_dependencies'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { type AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { DashboardDto } from './types.js'

import { toDashboardDto } from './mappers.js'
import { loadDashboardQueryData } from './queries.js'

export class DashboardService {
  private readonly activitySink?: AccountingActivitySink

  constructor(
    private readonly db: PostgresJsDatabase<any>,
    dependencies: AccountingServiceDependencies = {}
  ) {
    this.activitySink = dependencies.activitySink
  }

  async getDashboard(access: AccountingAccessContext): Promise<DashboardDto> {
    const data = await loadDashboardQueryData(this.db, access.tenantId)
    const dto = toDashboardDto(data)

    await this.activitySink?.record({
      isAnonymous: access.isAnonymous,
      level: 'debug',
      operation: 'load_dashboard',
      outcome: 'success',
      resourceType: 'dashboard',
      userId: access.actorId,
    })

    return dto
  }
}
