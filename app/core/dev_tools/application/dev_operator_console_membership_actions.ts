import type { CriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import type {
  DevOperatorScenarioContext,
  DevOperatorScenarioMember,
} from '#core/dev_tools/application/dev_operator_console_scenario_service'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { type AuthorizationService } from '#core/user_management/application/authorization_service'
import { type MemberService } from '#core/user_management/application/member_service'
import { and, desc, eq, sql } from 'drizzle-orm'

export class DevOperatorConsoleMembershipActions {
  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly memberService: MemberService,
    private readonly auditTrail: CriticalAuditTrail,
    private readonly queryService: {
      loadUserLabel(userId: string): Promise<string>
    }
  ) {}

  async changeMemberRole(
    scenario: DevOperatorScenarioContext,
    authorizationService: AuthorizationService,
    requestedMemberId?: string
  ): Promise<string> {
    const target = await this.findTargetMember(
      scenario.tenantId,
      scenario.actorUserId,
      requestedMemberId
    )

    if (!target) {
      throw new DomainError(
        'No other member is available in the selected tenant.',
        'business_logic_error'
      )
    }

    const subject = await authorizationService.membershipSubject(scenario.tenantId, target.id)
    authorizationService.authorize(scenario.actor, 'membership.changeRole', subject ?? undefined)

    const nextRole = target.role === 'admin' ? 'member' : 'admin'
    await this.memberService.updateMemberRole(target.id, nextRole, scenario.tenantId)
    const membershipLabel = await this.queryService.loadUserLabel(target.userId)

    await this.auditTrail.record(this.db, {
      action: 'dev_change_member_role',
      actorId: scenario.access.actorId,
      changes: {
        after: { role: nextRole },
        before: { role: target.role },
      },
      entityId: target.id,
      entityType: 'member',
      metadata: {
        memberUserId: target.userId,
        memberUserLabel: membershipLabel,
        result: 'success',
      },
      tenantId: scenario.tenantId,
    })

    return `${membershipLabel} switched to ${nextRole}.`
  }

  async toggleMemberActive(
    scenario: DevOperatorScenarioContext,
    authorizationService: AuthorizationService,
    requestedMemberId?: string
  ): Promise<string> {
    const target = await this.findTargetMember(
      scenario.tenantId,
      scenario.actorUserId,
      requestedMemberId
    )

    if (!target) {
      throw new DomainError(
        'No other member is available in the selected tenant.',
        'business_logic_error'
      )
    }

    const subject = await authorizationService.membershipSubject(scenario.tenantId, target.id)
    authorizationService.authorize(scenario.actor, 'membership.toggleActive', subject ?? undefined)

    const nextActive = !target.isActive
    await this.memberService.toggleMemberActive(
      target.id,
      nextActive,
      scenario.tenantId,
      scenario.actorUserId
    )

    return `${target.name} ${nextActive ? 'activated' : 'deactivated'}.`
  }

  private async findTargetMember(
    tenantId: string,
    actorUserId: string,
    requestedMemberId?: string
  ): Promise<DevOperatorScenarioMember | null> {
    const [row] = await this.db
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
      .where(
        requestedMemberId
          ? and(eq(schema.member.organizationId, tenantId), eq(schema.member.id, requestedMemberId))
          : and(
              eq(schema.member.organizationId, tenantId),
              sql`${schema.member.userId} <> ${actorUserId}`
            )
      )
      .orderBy(desc(schema.member.createdAt))
      .limit(1)

    return row
      ? {
          ...row,
          role: row.role as 'admin' | 'member' | 'owner',
        }
      : null
  }
}
