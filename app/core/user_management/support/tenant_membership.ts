import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { and, eq } from 'drizzle-orm'

/**
 * Returns true if the user has a member row for the organization (tenant).
 * Use for defense in depth alongside session `activeOrganizationId`.
 */
export async function userIsMemberOfOrganization(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, organizationId)))
    .limit(1)

  return row !== undefined
}
