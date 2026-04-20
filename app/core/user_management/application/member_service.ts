import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

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
 * Raised when the actor is not an admin or owner of the organization.
 */
export class InsufficientMemberRoleError extends DomainError {
  constructor() {
    super(
      'You must be an admin or owner of this organization to manage members.',
      'forbidden',
      'InsufficientMemberRoleError'
    )
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
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  /**
   * List all members of the given organization.
   * Requires the actor to be an admin or owner of the organization.
   */
  async listMembers(tenantId: string, actorId: string): Promise<MemberDto[]> {
    await this.requireAdminOrOwner(tenantId, actorId)

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
   * 1. Actor must be admin or owner.
   * 2. Target must exist in the organization.
   * 3. Target role is owner → forbidden.
   * 4. Actor === target → cannot deactivate self.
   * 5. Target is admin and actor is not owner → forbidden.
   */
  async toggleMemberActive(
    memberId: string,
    isActive: boolean,
    tenantId: string,
    actorId: string
  ): Promise<void> {
    const actorRow = await this.requireAdminOrOwner(tenantId, actorId)

    const [targetRow] = await this.db
      .select({
        id: schema.member.id,
        role: schema.member.role,
        userId: schema.member.userId,
      })
      .from(schema.member)
      .where(and(eq(schema.member.id, memberId), eq(schema.member.organizationId, tenantId)))
      .limit(1)

    if (!targetRow) {
      throw new MemberNotFoundError()
    }

    if (targetRow.role === 'owner') {
      throw new CannotModifyOwnerError()
    }

    if (targetRow.userId === actorId) {
      throw new CannotDeactivateSelfError()
    }

    if (targetRow.role === 'admin' && actorRow.role !== 'owner') {
      throw new AdminCannotModifyAdminError()
    }

    await this.db
      .update(schema.member)
      .set({ isActive })
      .where(and(eq(schema.member.id, memberId), eq(schema.member.organizationId, tenantId)))
  }

  /**
   * Fetch the actor's member row and assert they are admin or owner.
   * Returns the row for further use (e.g. role checks).
   */
  private async requireAdminOrOwner(
    tenantId: string,
    actorId: string
  ): Promise<{ id: string; role: string; userId: string }> {
    const [actorRow] = await this.db
      .select({
        id: schema.member.id,
        role: schema.member.role,
        userId: schema.member.userId,
      })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.userId, actorId),
          eq(schema.member.organizationId, tenantId),
          eq(schema.member.isActive, true)
        )
      )
      .limit(1)

    if (!actorRow || (actorRow.role !== 'admin' && actorRow.role !== 'owner')) {
      throw new InsufficientMemberRoleError()
    }

    return actorRow
  }
}
