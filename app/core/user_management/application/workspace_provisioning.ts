import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type AuditDbExecutor,
  type CriticalAuditTrail,
  DatabaseCriticalAuditTrail,
} from '#core/accounting/application/audit/critical_audit_trail'
import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { and, eq, sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { v7 as uuidv7 } from 'uuid'

import {
  recordUserManagementActivityEvent,
  type UserManagementActivitySink,
} from '../support/activity_log.js'

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
 * has an active membership within it.
 *
 * - Upserts the organization row when missing.
 * - Updates the workspace label/metadata when a generic or anonymous bootstrap
 *   should be replaced by the current user-facing workspace label.
 * - Creates the membership when missing. The very first member becomes `owner`,
 *   later members join as `member`.
 * - Reactivates an existing membership when needed, without auto-elevating role.
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
  },
  options: {
    activitySink?: UserManagementActivitySink
    auditTrail?: CriticalAuditTrail
  } = {}
): Promise<WorkspaceProvisioningResult> {
  const activitySink = options.activitySink
  const auditTrail = options.auditTrail ?? new DatabaseCriticalAuditTrail()
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
      const memberId = uuidv7()
      const [organizationMemberCount] = await tx
        .select({ value: sql<number>`count(*)` })
        .from(schema.member)
        .where(eq(schema.member.organizationId, input.orgId))
        .limit(1)

      const isFirstOrganizationMember = Number(organizationMemberCount?.value ?? 0) === 0
      await tx
        .insert(schema.member)
        .values({
          createdAt: new Date(),
          id: memberId,
          organizationId: input.orgId,
          role: isFirstOrganizationMember ? 'owner' : 'member',
          userId: input.userId,
        })
        .onConflictDoNothing()
      await auditTrail.record(tx, {
        action: 'member_workspace_provisioned',
        actorId: input.userId,
        changes: {
          after: { isActive: true, role: isFirstOrganizationMember ? 'owner' : 'member' },
          before: { isActive: null, role: null },
        },
        entityId: memberId,
        entityType: 'member',
        metadata: { source: 'workspace_provisioning', workspaceMode: 'single_tenant' },
        tenantId: input.orgId,
      })
      recordUserManagementActivityEvent(
        {
          entityId: memberId,
          entityType: 'member',
          event: 'single_tenant_membership_provision_success',
          level: 'info',
          metadata: {
            role: isFirstOrganizationMember ? 'owner' : 'member',
            workspaceMode: 'single_tenant',
          },
          outcome: 'success',
          tenantId: input.orgId,
          userId: input.userId,
        },
        activitySink
      )
      wasProvisioned = true
    } else if (existing.isActive === false) {
      await tx
        .update(schema.member)
        .set({ isActive: true })
        .where(eq(schema.member.id, existing.id))
      await auditTrail.record(tx, {
        action: 'member_workspace_membership_reactivated',
        actorId: input.userId,
        changes: {
          after: { isActive: true },
          before: { isActive: false },
        },
        entityId: existing.id,
        entityType: 'member',
        metadata: { source: 'workspace_provisioning', workspaceMode: 'single_tenant' },
        tenantId: input.orgId,
      })
      recordUserManagementActivityEvent(
        {
          entityId: existing.id,
          entityType: 'member',
          event: 'single_tenant_membership_reactivated_success',
          level: 'info',
          metadata: { workspaceMode: 'single_tenant' },
          outcome: 'success',
          tenantId: input.orgId,
          userId: input.userId,
        },
        activitySink
      )
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
  },
  options: {
    activitySink?: UserManagementActivitySink
    auditTrail?: CriticalAuditTrail
  } = {}
): Promise<WorkspaceProvisioningResult> {
  const activitySink = options.activitySink
  const auditTrail = options.auditTrail ?? new DatabaseCriticalAuditTrail()
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
    await auditTrail.record(tx, {
      action: 'member_workspace_provisioned',
      actorId: input.userId,
      changes: {
        after: { isActive: true, role: 'owner' },
        before: { isActive: null, role: null },
      },
      entityId: memberId,
      entityType: 'member',
      metadata: { source: 'workspace_provisioning', workspaceMode: 'personal' },
      tenantId: organizationId,
    })
    recordUserManagementActivityEvent(
      {
        entityId: memberId,
        entityType: 'member',
        event: 'personal_workspace_owner_membership_provision_success',
        level: 'info',
        metadata: { workspaceMode: 'personal' },
        outcome: 'success',
        tenantId: organizationId,
        userId: input.userId,
      },
      activitySink
    )

    await tx
      .update(schema.session)
      .set({ activeOrganizationId: organizationId })
      .where(eq(schema.session.token, input.sessionToken))
    await recordSessionActiveOrganizationChanged(tx, auditTrail, {
      actorId: input.userId,
      afterOrganizationId: organizationId,
      beforeOrganizationId: sessionRow.activeOrganizationId,
      sessionId: sessionRow.id,
      source: 'workspace_provisioning',
    })
    recordUserManagementActivityEvent(
      {
        entityId: organizationId,
        entityType: 'workspace',
        event: 'session_active_organization_set_success',
        level: 'info',
        metadata: { source: 'workspace_provisioning' },
        outcome: 'success',
        tenantId: organizationId,
        userId: input.userId,
      },
      activitySink
    )

    return { organizationId, wasProvisioned: true }
  })
}

export async function setActiveOrganizationForSession(
  db: PostgresJsDatabase<typeof schema>,
  sessionToken: string,
  organizationId: string,
  options: {
    activitySink?: UserManagementActivitySink
    auditTrail?: CriticalAuditTrail
    userId?: null | string
  } = {}
): Promise<void> {
  const auditTrail = options.auditTrail ?? new DatabaseCriticalAuditTrail()

  if (!options.userId) {
    throw new DomainError(
      'A user id is required to activate a workspace for a session.',
      'forbidden',
      'ActiveOrganizationUserRequiredError'
    )
  }

  const didChange = await db.transaction(async (tx) => {
    const [sessionRow] = await tx
      .select({
        activeOrganizationId: schema.session.activeOrganizationId,
        id: schema.session.id,
      })
      .from(schema.session)
      .where(eq(schema.session.token, sessionToken))
      .limit(1)

    if (!sessionRow || sessionRow.activeOrganizationId === organizationId) {
      return false
    }

    const [membership] = await tx
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.userId, options.userId!),
          eq(schema.member.organizationId, organizationId),
          eq(schema.member.isActive, true)
        )
      )
      .limit(1)

    if (!membership) {
      throw new DomainError(
        'Active workspace membership is required to activate this workspace.',
        'forbidden',
        'ActiveOrganizationMembershipRequiredError'
      )
    }

    await tx
      .update(schema.session)
      .set({ activeOrganizationId: organizationId })
      .where(eq(schema.session.token, sessionToken))

    await recordSessionActiveOrganizationChanged(tx, auditTrail, {
      actorId: options.userId ?? 'system',
      afterOrganizationId: organizationId,
      beforeOrganizationId: sessionRow.activeOrganizationId,
      sessionId: sessionRow.id,
      source: 'workspace_session',
    })

    return true
  })

  if (!didChange) {
    return
  }

  recordUserManagementActivityEvent(
    {
      entityId: organizationId,
      entityType: 'workspace',
      event: 'session_active_organization_set_success',
      level: 'info',
      metadata: { source: 'workspace_session' },
      outcome: 'success',
      tenantId: organizationId,
      userId: options.userId ?? null,
    },
    options.activitySink
  )
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

async function recordSessionActiveOrganizationChanged(
  tx: AuditDbExecutor,
  auditTrail: CriticalAuditTrail,
  input: {
    actorId: string
    afterOrganizationId: string
    beforeOrganizationId: null | string
    sessionId: string
    source: 'workspace_provisioning' | 'workspace_session'
  }
): Promise<void> {
  await auditTrail.record(tx, {
    action: 'session_active_organization_changed',
    actorId: input.actorId,
    changes: {
      after: { activeOrganizationId: input.afterOrganizationId },
      before: { activeOrganizationId: input.beforeOrganizationId },
    },
    entityId: input.sessionId,
    entityType: 'session',
    metadata: { source: input.source },
    tenantId: input.afterOrganizationId,
  })
}
