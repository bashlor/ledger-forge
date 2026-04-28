import type { HttpContext } from '@adonisjs/core/http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { listRecentAuditEventsForTenant } from '#core/accounting/application/audit/audit_queries'
import * as schema from '#core/common/drizzle/index'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { resolveActiveTenantContext } from '#core/user_management/application/active_tenant_context'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { MemberService } from '#core/user_management/application/member_service'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'

export default class OrganizationController {
  @inject()
  async show(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    memberService: MemberService
  ) {
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    authorizationService.authorize(activeTenant.actor, 'membership.list')

    const canViewAuditTrail = authorizationService.allows(activeTenant.actor, 'auditTrail.view')
    const canManageMembershipRoles = authorizationService.allows(
      activeTenant.actor,
      'membership.changeRole'
    )
    const canToggleMembershipStatus = authorizationService.allows(
      activeTenant.actor,
      'membership.toggleActive'
    )
    const db = (await app.container.make('drizzle')) as PostgresJsDatabase<typeof schema>
    const [members, auditEvents] = await Promise.all([
      memberService.listMembers(activeTenant.tenantId),
      canViewAuditTrail
        ? listRecentAuditEventsForTenant(db, { limit: 20, tenantId: activeTenant.tenantId })
        : Promise.resolve([]),
    ])

    return renderInertiaPage(ctx.inertia, 'app/organization', {
      auditEvents,
      canManageMembershipRoles,
      canToggleMembershipStatus,
      canViewAuditTrail,
      members,
      viewerMembershipRole: activeTenant.actor.membershipRole,
      viewerUserId: activeTenant.userId,
    })
  }
}
