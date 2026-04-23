import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type CriticalAuditTrail,
  DatabaseCriticalAuditTrail,
} from '#core/accounting/application/audit/critical_audit_trail'
import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { and, eq } from 'drizzle-orm'

export interface MemberDto {
  email: string
  id: string
  isActive: boolean
  name: string
  role: MemberRole
  userId: string
}

export type MemberRole = 'admin' | 'member' | 'owner'

type MemberMutationExecutor = PostgresJsDatabase<typeof schema>

interface MemberMutationTarget {
  id: string
  isActive: boolean
  role: MemberRole
  userId: string
}

type MemberMutationTx = Parameters<Parameters<MemberMutationExecutor['transaction']>[0]>[0]

interface MemberServiceDependencies {
  auditTrail?: CriticalAuditTrail
}

/**
 * Raised when an admin attempts to modify another admin (owner-only operation).
 */
export class AdminCannotModifyAdminError extends DomainError {
  constructor() {
    super(
      'Only the organization owner can deactivate another admin.',
      'forbidden',
      'AdminCannotModifyAdminError'
    )
  }
}

/**
 * Raised when assigning the owner role through the role-management flow.
 */
export class CannotAssignOwnerRoleError extends DomainError {
  constructor() {
    super(
      'The owner role cannot be assigned through this action.',
      'business_logic_error',
      'CannotAssignOwnerRoleError'
    )
  }
}

/**
 * Raised when an actor attempts to deactivate their own membership.
 */
export class CannotDeactivateSelfError extends DomainError {
  constructor() {
    super('You cannot deactivate your own membership.', 'forbidden', 'CannotDeactivateSelfError')
  }
}
/**
 * Raised when attempting an operation that would affect the organization owner.
 */
export class CannotModifyOwnerError extends DomainError {
  constructor() {
    super('The organization owner cannot be deactivated.', 'forbidden', 'CannotModifyOwnerError')
  }
}

/**
 * Raised when the target member is not found in the organization.
 */
export class MemberNotFoundError extends DomainError {
  constructor() {
    super('Member not found in this organization.', 'not_found', 'MemberNotFoundError')
  }
}

export class MemberService {
  private readonly auditTrail: CriticalAuditTrail

  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    dependencies: MemberServiceDependencies = {}
  ) {
    this.auditTrail = dependencies.auditTrail ?? new DatabaseCriticalAuditTrail()
  }

  /**
   * List all members of the given organization.
   * Authorization is enforced before the service is called.
   */
  async listMembers(tenantId: string): Promise<MemberDto[]> {
    const rows = await this.db
      .select({
        email: schema.user.email,
        id: schema.member.id,
        isActive: schema.member.isActive,
        name: schema.user.name,
        role: schema.member.role,
        userId: schema.member.userId,
      })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
      .where(eq(schema.member.organizationId, tenantId))
      .orderBy(schema.member.createdAt)

    return rows.map((r) => ({
      email: r.email,
      id: r.id,
      isActive: r.isActive,
      name: r.name,
      role: r.role as MemberRole,
      userId: r.userId,
    }))
  }

  /**
   * Activate or deactivate a membership.
   *
   * Guards (in order):
   * 1. Target must exist in the organization.
   * 2. Target role is owner → forbidden.
   * 3. Actor === target → cannot deactivate self.
   */
  async toggleMemberActive(
    memberId: string,
    isActive: boolean,
    tenantId: string,
    actorId: string
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const target = await this.findTargetMember(tx, memberId, tenantId)

      this.assertCanToggleMember(target, actorId, isActive)

      const nextRole = !isActive && target.role === 'admin' ? 'member' : target.role
      if (target.isActive === isActive && target.role === nextRole) {
        return
      }

      await tx
        .update(schema.member)
        .set({ isActive, role: nextRole })
        .where(and(eq(schema.member.id, memberId), eq(schema.member.organizationId, tenantId)))

      const before: Record<string, unknown> = { isActive: target.isActive }
      const after: Record<string, unknown> = { isActive }

      if (target.role !== nextRole) {
        before.role = target.role
        after.role = nextRole
      }

      await this.auditTrail.record(tx, {
        action: isActive ? 'member_activated' : 'member_deactivated',
        actorId,
        changes: { after, before },
        entityId: target.id,
        entityType: 'member',
        metadata: {
          memberUserId: target.userId,
        },
        tenantId,
      })
    })
  }

  async updateMemberRole(
    memberId: string,
    role: MemberRole,
    tenantId: string,
    actorId: string
  ): Promise<void> {
    if (role === 'owner') {
      throw new CannotAssignOwnerRoleError()
    }

    await this.db.transaction(async (tx) => {
      const target = await this.findTargetMember(tx, memberId, tenantId)

      if (target.role === 'owner') {
        throw new CannotModifyOwnerError()
      }

      if (target.role === role) {
        return
      }

      await tx
        .update(schema.member)
        .set({ role })
        .where(and(eq(schema.member.id, memberId), eq(schema.member.organizationId, tenantId)))

      await this.auditTrail.record(tx, {
        action: 'member_role_changed',
        actorId,
        changes: {
          after: { role },
          before: { role: target.role },
        },
        entityId: target.id,
        entityType: 'member',
        metadata: {
          memberUserId: target.userId,
        },
        tenantId,
      })
    })
  }

  private assertCanToggleMember(
    target: MemberMutationTarget,
    actorId: string,
    nextActive: boolean
  ): void {
    if (target.role === 'owner') {
      throw new CannotModifyOwnerError()
    }

    if (!nextActive && target.userId === actorId) {
      throw new CannotDeactivateSelfError()
    }
  }

  private async findTargetMember(
    executor: MemberMutationExecutor | MemberMutationTx,
    memberId: string,
    tenantId: string
  ): Promise<MemberMutationTarget> {
    const [targetRow] = await executor
      .select({
        id: schema.member.id,
        isActive: schema.member.isActive,
        role: schema.member.role,
        userId: schema.member.userId,
      })
      .from(schema.member)
      .where(and(eq(schema.member.id, memberId), eq(schema.member.organizationId, tenantId)))
      .limit(1)

    if (!targetRow) {
      throw new MemberNotFoundError()
    }

    return {
      id: targetRow.id,
      isActive: targetRow.isActive,
      role: targetRow.role as MemberRole,
      userId: targetRow.userId,
    }
  }
}
