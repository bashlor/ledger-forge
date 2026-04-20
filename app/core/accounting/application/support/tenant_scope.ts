import type { Column, SQL } from 'drizzle-orm'

import { and, eq } from 'drizzle-orm'

/**
 * Adds a strict tenant filter to an existing WHERE clause.
 * `tenantId` is required — this never silently skips the filter.
 */
export function requireTenantScope(
  where: SQL<unknown> | undefined,
  tenantId: string,
  tenantColumn: Column
): SQL<unknown> {
  return and(where, eq(tenantColumn, tenantId))!
}
