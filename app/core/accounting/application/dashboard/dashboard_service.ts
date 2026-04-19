import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type AccountingAccessContext,
  SYSTEM_ACCOUNTING_ACCESS_CONTEXT,
} from '#core/accounting/application/support/access_context'

import type { DashboardDto } from './types.js'

import { toDashboardDto } from './mappers.js'
import { loadDashboardQueryData } from './queries.js'

export class DashboardService {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async getDashboard(
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<DashboardDto> {
    const data = await loadDashboardQueryData(this.db)
    return toDashboardDto(data)
  }
}
