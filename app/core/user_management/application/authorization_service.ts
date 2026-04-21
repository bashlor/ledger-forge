import type {
  AuthorizationAbility,
  AuthorizationActor,
  AuthorizationSubject,
  MembershipAuthorizationSubject,
} from '#core/user_management/authorization/authorizer'
import type { AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { can } from '#core/user_management/authorization/authorizer'
import env from '#start/env'
import { and, eq } from 'drizzle-orm'

export class AuthorizationDeniedError extends DomainError {
  constructor(message = 'You are not allowed to perform this action.') {
    super(message, 'forbidden', 'AuthorizationDeniedError')
  }
}

export class AuthorizationService {
  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly devOperatorPublicIds: readonly string[] = []
  ) {}

  async actorFromSession(authSession?: AuthResult | null): Promise<AuthorizationActor> {
    const activeTenantId = authSession?.session.activeOrganizationId ?? null
    const userId = authSession?.user.id ?? null

    if (!activeTenantId || !userId) {
      return {
        activeTenantId,
        isDevOperator: this.isDevOperator(authSession),
        membershipIsActive: false,
        membershipRole: null,
        userId,
      }
    }

    const [membership] = await this.db
      .select({
        isActive: schema.member.isActive,
        role: schema.member.role,
      })
      .from(schema.member)
      .where(
        and(eq(schema.member.organizationId, activeTenantId), eq(schema.member.userId, userId))
      )
      .limit(1)

    return {
      activeTenantId,
      isDevOperator: this.isDevOperator(authSession),
      membershipIsActive: membership?.isActive ?? false,
      membershipRole: (membership?.role as AuthorizationActor['membershipRole']) ?? null,
      userId,
    }
  }

  allows(
    actor: AuthorizationActor,
    ability: AuthorizationAbility,
    subject?: AuthorizationSubject
  ): boolean {
    return can(actor, ability, subject)
  }

  authorize(
    actor: AuthorizationActor,
    ability: AuthorizationAbility,
    subject?: AuthorizationSubject
  ): void {
    if (!this.allows(actor, ability, subject)) {
      throw new AuthorizationDeniedError()
    }
  }

  async membershipSubject(
    tenantId: string,
    memberId: string
  ): Promise<MembershipAuthorizationSubject | null> {
    const [row] = await this.db
      .select({
        id: schema.member.id,
        isActive: schema.member.isActive,
        role: schema.member.role,
        tenantId: schema.member.organizationId,
        userId: schema.member.userId,
      })
      .from(schema.member)
      .where(and(eq(schema.member.id, memberId), eq(schema.member.organizationId, tenantId)))
      .limit(1)

    if (!row) {
      return null
    }

    return {
      id: row.id,
      isActive: row.isActive,
      role: row.role as MembershipAuthorizationSubject['role'],
      tenantId: row.tenantId,
      userId: row.userId,
    }
  }

  private isDevOperator(authSession?: AuthResult | null): boolean {
    if (env.get('NODE_ENV') !== 'development') {
      return false
    }

    const publicId = authSession?.user.publicId?.trim()
    if (!publicId) {
      return false
    }

    return this.devOperatorPublicIds.includes(publicId)
  }
}
