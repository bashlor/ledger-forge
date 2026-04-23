import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { and, eq, sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { v7 as uuidv7 } from 'uuid'

export type WorkspaceKind = 'anonymous' | 'personal'

export interface WorkspaceProvisioningResult {
  organizationId: null | string
  wasProvisioned: boolean
}

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

/**
 * Ensures the shared single-tenant organization exists and that the given user
 * is an active owner within it.
 *
 * - Upserts the organization row when missing.
 * - Updates the workspace label/metadata when a generic or anonymous bootstrap
 *   should be replaced by the current user-facing workspace label.
 * - Creates the membership when missing or upgrades an existing membership to an
 *   active `owner` role.
 *
 * Returns the shared organization id plus whether any provisioning change was
 * applied. Idempotent: safe to call on every request.
 */
export async function ensureSingleTenantMembership(
  db: PostgresJsDatabase<typeof schema>,
  input: {
    displayName?: string
    email?: string
    isAnonymous: boolean
    orgId: string
    userId: string
  }
): Promise<WorkspaceProvisioningResult> {
  const desiredWorkspace = buildWorkspaceLabel({
    displayName: input.displayName,
    email: input.email,
    isAnonymous: input.isAnonymous,
  })

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`single-tenant:${input.orgId}`}))`)

    let wasProvisioned = false

    await tx
      .insert(schema.organization)
      .values({
        createdAt: new Date(),
        id: input.orgId,
        logo: null,
        metadata: desiredWorkspace.metadata,
        name: desiredWorkspace.name,
        slug: buildSingleTenantSlug(input.orgId),
      })
      .onConflictDoNothing()

    const organizationRow = await tx.query.organization.findFirst({
      where: (organization, { eq: equal }) => equal(organization.id, input.orgId),
    })

    if (!organizationRow) {
      throw new Error(`Single-tenant organization ${input.orgId} could not be provisioned`)
    }

    const organizationPatch = buildSingleTenantOrganizationPatch(
      organizationRow,
      desiredWorkspace,
      input.isAnonymous
    )
    if (organizationPatch) {
      await tx
        .update(schema.organization)
        .set(organizationPatch)
        .where(eq(schema.organization.id, input.orgId))
      wasProvisioned = true
    }

    const [existing] = await tx
      .select({ id: schema.member.id, isActive: schema.member.isActive, role: schema.member.role })
      .from(schema.member)
      .where(
        and(eq(schema.member.userId, input.userId), eq(schema.member.organizationId, input.orgId))
      )
      .limit(1)

    if (!existing) {
      await tx
        .insert(schema.member)
        .values({
          createdAt: new Date(),
          id: uuidv7(),
          organizationId: input.orgId,
          role: 'owner',
          userId: input.userId,
        })
        .onConflictDoNothing()
      wasProvisioned = true
    } else if (existing.role !== 'owner' || existing.isActive === false) {
      await tx
        .update(schema.member)
        .set({ isActive: true, role: 'owner' })
        .where(eq(schema.member.id, existing.id))
      wasProvisioned = true
    }

    return { organizationId: input.orgId, wasProvisioned }
  })
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
): Promise<WorkspaceProvisioningResult> {
  const { metadata, name } = buildWorkspaceLabel({
    displayName: input.displayName,
    email: input.email,
    isAnonymous: input.isAnonymous,
  })

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.sessionToken}))`)

    const sessionRow = await tx.query.session.findFirst({
      where: (s, { eq: e }) => e(s.token, input.sessionToken),
    })

    if (!sessionRow || sessionRow.userId !== input.userId) {
      return { organizationId: null, wasProvisioned: false }
    }

    if (sessionRow.activeOrganizationId) {
      return {
        organizationId: sessionRow.activeOrganizationId,
        wasProvisioned: false,
      }
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

    return { organizationId, wasProvisioned: true }
  })
}

export async function setActiveOrganizationForSession(
  db: PostgresJsDatabase<typeof schema>,
  sessionToken: string,
  organizationId: string
): Promise<void> {
  await db
    .update(schema.session)
    .set({ activeOrganizationId: organizationId })
    .where(eq(schema.session.token, sessionToken))
}

function buildSingleTenantOrganizationPatch(
  organization: typeof schema.organization.$inferSelect,
  desiredWorkspace: { metadata: string; name: string },
  isAnonymous: boolean
): null | { metadata?: string; name?: string } {
  const currentKind = parseWorkspaceKind(organization.metadata)
  const currentName = organization.name.trim()
  const isGenericName = currentName.length === 0 || currentName === 'Organization'
  const shouldUseDesiredLabel =
    isGenericName || currentKind === null || (currentKind === 'anonymous' && !isAnonymous)

  const patch: { metadata?: string; name?: string } = {}
  if (shouldUseDesiredLabel && organization.name !== desiredWorkspace.name) {
    patch.name = desiredWorkspace.name
  }
  if (shouldUseDesiredLabel && organization.metadata !== desiredWorkspace.metadata) {
    patch.metadata = desiredWorkspace.metadata
  }

  return Object.keys(patch).length > 0 ? patch : null
}

function buildSingleTenantSlug(orgId: string): string {
  const digest = createHash('sha256').update(orgId).digest('hex').slice(0, 24)
  return `single-${digest}`
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
