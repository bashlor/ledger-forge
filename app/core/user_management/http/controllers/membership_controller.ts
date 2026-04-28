import type { HttpContext } from '@adonisjs/core/http'

import { flashAction } from '#core/common/http/helpers/flash_action'
import { resolveActiveTenantContext } from '#core/user_management/application/active_tenant_context'
import {
  AuthorizationDeniedError,
  AuthorizationService,
} from '#core/user_management/application/authorization_service'
import { inject } from '@adonisjs/core'

import { MemberNotFoundError, MemberService } from '../../application/member_service.js'
import {
  recordMembershipSecurityEvent,
  runMemberMutationWithGuards,
  toMemberMutationTarget,
} from '../helpers/membership_mutation_guards.js'
import { toggleMemberStatusValidator, updateMemberRoleValidator } from '../validators/member.js'

export default class MembershipController {
  /**
   * GET /account/organizations/members
   * Returns the list of members in the active organization as JSON.
   * Requires admin or owner role.
   */
  @inject()
  async index(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    memberService: MemberService
  ) {
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const { actor, tenantId } = activeTenant

    try {
      authorizationService.authorize(actor, 'membership.list')
    } catch (error) {
      if (error instanceof AuthorizationDeniedError) {
        recordMembershipSecurityEvent(ctx, 'membership_list_denied', {
          entityId: actor.userId ?? 'unknown',
          metadata: { actorRole: actor.membershipRole, actorUserId: actor.userId, tenantId },
          tenantId,
        })
      }
      throw error
    }

    const members = await memberService.listMembers(tenantId)
    return ctx.response.ok(members)
  }

  /**
   * PATCH /account/organizations/members/:memberId
   * Activate or deactivate a membership.
   * Requires admin or owner role, with additional guards enforced by MemberService.
   */
  @inject()
  async toggleActive(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    memberService: MemberService
  ) {
    const memberId = ctx.params.memberId as string
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const { actor, tenantId } = activeTenant
    const actorId = activeTenant.userId
    const { isActive } = await ctx.request.validateUsing(toggleMemberStatusValidator)
    const target = await authorizationService.membershipSubject(tenantId, memberId)

    if (!target) {
      recordMembershipSecurityEvent(ctx, 'membership_toggle_target_not_found', {
        entityId: memberId,
        metadata: {
          actorRole: actor.membershipRole,
          actorUserId: actor.userId,
          requestedIsActive: isActive,
        },
        tenantId,
        userId: actorId,
      })
      throw new MemberNotFoundError()
    }
    const targetMember = toMemberMutationTarget(target)

    await flashAction(
      ctx,
      async () => {
        await runMemberMutationWithGuards({
          assertAuthorized: () =>
            authorizationService.authorize(actor, 'membership.toggleActive', target),
          onAuthorizationDenied: () =>
            recordMembershipSecurityEvent(ctx, 'membership_toggle_denied', {
              entityId: memberId,
              metadata: {
                actorRole: actor.membershipRole,
                actorUserId: actor.userId,
                requestedIsActive: isActive,
                targetRole: target.role,
                targetUserId: target.userId,
              },
              tenantId,
              userId: actorId,
            }),
          onExpectedMutationRejection: (error) =>
            recordMembershipSecurityEvent(ctx, 'membership_toggle_rejected', {
              entityId: memberId,
              metadata: {
                actorRole: actor.membershipRole,
                actorUserId: actor.userId,
                errorName: error instanceof Error ? error.name : 'UnknownError',
                requestedIsActive: isActive,
                targetRole: target.role,
                targetUserId: target.userId,
              },
              tenantId,
              userId: actorId,
            }),
          runMutation: () =>
            memberService.toggleMemberActive(memberId, isActive, tenantId, actorId, targetMember),
        })
      },
      isActive ? 'Member activated.' : 'Member deactivated.'
    )

    return ctx.response.redirect().toRoute('organization.show')
  }

  @inject()
  async updateRole(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    memberService: MemberService
  ) {
    const memberId = ctx.params.memberId as string
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const { actor, tenantId } = activeTenant
    const { role } = await ctx.request.validateUsing(updateMemberRoleValidator)
    const target = await authorizationService.membershipSubject(tenantId, memberId)

    if (!target) {
      recordMembershipSecurityEvent(ctx, 'membership_change_role_target_not_found', {
        entityId: memberId,
        metadata: {
          actorRole: actor.membershipRole,
          actorUserId: actor.userId,
          requestedRole: role,
        },
        tenantId,
        userId: activeTenant.userId,
      })
      throw new MemberNotFoundError()
    }
    const targetMember = toMemberMutationTarget(target)
    const actorId = activeTenant.userId

    await flashAction(
      ctx,
      async () => {
        await runMemberMutationWithGuards({
          assertAuthorized: () =>
            authorizationService.authorize(actor, 'membership.changeRole', target),
          onAuthorizationDenied: () =>
            recordMembershipSecurityEvent(ctx, 'membership_change_role_denied', {
              entityId: memberId,
              metadata: {
                actorRole: actor.membershipRole,
                actorUserId: actor.userId,
                requestedRole: role,
                targetRole: target.role,
                targetUserId: target.userId,
              },
              tenantId,
              userId: actorId,
            }),
          onExpectedMutationRejection: (error) =>
            recordMembershipSecurityEvent(ctx, 'membership_change_role_rejected', {
              entityId: memberId,
              metadata: {
                actorRole: actor.membershipRole,
                actorUserId: actor.userId,
                errorName: error instanceof Error ? error.name : 'UnknownError',
                requestedRole: role,
                targetRole: target.role,
                targetUserId: target.userId,
              },
              tenantId,
              userId: actorId,
            }),
          runMutation: () =>
            memberService.updateMemberRole(memberId, role, tenantId, actorId, targetMember),
        })
      },
      role === 'admin' ? 'Member promoted to admin.' : 'Admin demoted to member.'
    )

    return ctx.response.redirect().toRoute('organization.show')
  }
}
