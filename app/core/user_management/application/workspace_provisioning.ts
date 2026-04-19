import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { eq, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

export type WorkspaceKind = 'anonymous' | 'personal'

export interface WorkspaceShareProps {
  id: string
  isAnonymousWorkspace: boolean
  name: string
  slug: string
}

export async function clearActiveOrganizationForSession(
  db: PostgresJsDatabase<typeof schema>,
  sessionToken: string
): Promise<void> {
  await db
    .update(schema.session)
    .set({ activeOrganizationId: null })
    .where(eq(schema.session.token, sessionToken))
}

export async function loadWorkspaceShare(
  db: PostgresJsDatabase<typeof schema>,
  organizationId: string
): Promise<null | WorkspaceShareProps> {
  const row = await db.query.organization.findFirst({
    where: (o, { eq: e }) => e(o.id, organizationId),
  })
  if (!row) {
    return null
  }
  return organizationRowToWorkspaceShare(row)
}

export function organizationRowToWorkspaceShare(
  row: typeof schema.organization.$inferSelect
): WorkspaceShareProps {
  const kind = parseWorkspaceKind(row.metadata)
  return {
    id: row.id,
    isAnonymousWorkspace: kind === 'anonymous',
    name: row.name,
    slug: row.slug,
  }
}

export async function provisionPersonalWorkspace(
  db: PostgresJsDatabase<typeof schema>,
  input: {
    displayName?: string
    email?: string
    isAnonymous: boolean
    sessionToken: string
    userId: string
  }
): Promise<void> {
  const { metadata, name } = buildWorkspaceLabel({
    displayName: input.displayName,
    email: input.email,
    isAnonymous: input.isAnonymous,
  })

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.sessionToken}))`)

    const sessionRow = await tx.query.session.findFirst({
      where: (s, { eq: e }) => e(s.token, input.sessionToken),
    })

    if (!sessionRow || sessionRow.userId !== input.userId) {
      return
    }

    if (sessionRow.activeOrganizationId) {
      return
    }

    let slug = newSlugCandidate()
    for (let attempt = 0; attempt < 8; attempt++) {
      const clash = await tx
        .select({ id: schema.organization.id })
        .from(schema.organization)
        .where(eq(schema.organization.slug, slug))
        .limit(1)
      if (clash.length === 0) {
        break
      }
      slug = newSlugCandidate()
      if (attempt === 7) {
        slug = `ws-${uuidv7().replaceAll('-', '')}`
      }
    }

    const organizationId = uuidv7()
    const memberId = uuidv7()

    await tx.insert(schema.organization).values({
      createdAt: new Date(),
      id: organizationId,
      logo: null,
      metadata,
      name,
      slug,
    })

    await tx.insert(schema.member).values({
      createdAt: new Date(),
      id: memberId,
      organizationId,
      role: 'owner',
      userId: input.userId,
    })

    await tx
      .update(schema.session)
      .set({ activeOrganizationId: organizationId })
      .where(eq(schema.session.token, input.sessionToken))
  })
}

function buildWorkspaceLabel(input: {
  displayName?: string
  email?: string
  isAnonymous: boolean
}): { metadata: string; name: string } {
  if (input.isAnonymous) {
    return {
      metadata: JSON.stringify({ workspaceKind: 'anonymous' satisfies WorkspaceKind }),
      name: 'Anonymous workspace',
    }
  }
  const base =
    input.displayName?.trim() ||
    (input.email?.includes('@') ? input.email.split('@')[0] : input.email)?.trim() ||
    'Workspace'
  const truncated = base.length > 80 ? `${base.slice(0, 77)}…` : base
  return {
    metadata: JSON.stringify({ workspaceKind: 'personal' satisfies WorkspaceKind }),
    name: `${truncated} workspace`,
  }
}

function newSlugCandidate(): string {
  const raw = uuidv7().replaceAll('-', '')
  return `ws-${raw.slice(0, 24)}`
}

function parseWorkspaceKind(metadata: null | string | undefined): null | WorkspaceKind {
  if (!metadata) {
    return null
  }
  try {
    const parsed = JSON.parse(metadata) as { workspaceKind?: string }
    if (parsed.workspaceKind === 'anonymous') {
      return 'anonymous'
    }
    if (parsed.workspaceKind === 'personal') {
      return 'personal'
    }
  } catch {
    return null
  }
  return null
}
