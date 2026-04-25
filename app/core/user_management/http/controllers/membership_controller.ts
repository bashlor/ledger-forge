import type { HttpContext } from '@adonisjs/core/http'

import { flashAction } from '#core/common/http/helpers/flash_action'
import {
  AuthorizationDeniedError,
  AuthorizationService,
} from '#core/user_management/application/authorization_service'
import { inject } from '@adonisjs/core'

import {
  CannotAssignOwnerRoleError,
  CannotDeactivateSelfError,
  CannotModifyOwnerError,
  type MemberMutationTarget,
  MemberNotFoundError,
  MemberService,
} from '../../application/member_service.js'
import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '../../support/activity_log.js'
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
    const tenantId = ctx.authSession!.session.activeOrganizationId!
    const actor = await authorizationService.actorFromSession(ctx.authSession)

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
    const tenantId = ctx.authSession!.session.activeOrganizationId!
    const actorId = ctx.authSession!.user.id
    const { isActive } = await ctx.request.validateUsing(toggleMemberStatusValidator)
    const actor = await authorizationService.actorFromSession(ctx.authSession)
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
    const targetMember: MemberMutationTarget = {
      id: target.id,
      isActive: target.isActive,
      role: target.role,
      userId: target.userId,
    }

    await flashAction(
      ctx,
      async () => {
        try {
          authorizationService.authorize(actor, 'membership.toggleActive', target)
        } catch (error) {
          if (error instanceof AuthorizationDeniedError) {
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
            })
          }
          throw error
        }

        try {
          await memberService.toggleMemberActive(
            memberId,
            isActive,
            tenantId,
            actorId,
            targetMember
          )
        } catch (error) {
          if (isExpectedMemberMutationError(error)) {
            recordMembershipSecurityEvent(ctx, 'membership_toggle_rejected', {
              entityId: memberId,
              metadata: {
                actorRole: actor.membershipRole,
                actorUserId: actor.userId,
                errorName: error.name,
                requestedIsActive: isActive,
                targetRole: target.role,
                targetUserId: target.userId,
              },
              tenantId,
              userId: actorId,
            })
          }
          throw error
        }
      },
      isActive ? 'Member activated.' : 'Member deactivated.'
    )

    return ctx.response.redirect().toRoute('members.index')
  }

  @inject()
  async updateRole(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    memberService: MemberService
  ) {
    const memberId = ctx.params.memberId as string
    const tenantId = ctx.authSession!.session.activeOrganizationId!
    const actor = await authorizationService.actorFromSession(ctx.authSession)
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
        userId: ctx.authSession!.user.id,
      })
      throw new MemberNotFoundError()
    }
    const targetMember: MemberMutationTarget = {
      id: target.id,
      isActive: target.isActive,
      role: target.role,
      userId: target.userId,
    }

    await flashAction(
      ctx,
      async () => {
        try {
          authorizationService.authorize(actor, 'membership.changeRole', target)
        } catch (error) {
          if (error instanceof AuthorizationDeniedError) {
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
              userId: ctx.authSession!.user.id,
            })
          }
          throw error
        }

        try {
          await memberService.updateMemberRole(
            memberId,
            role,
            tenantId,
            ctx.authSession!.user.id,
            targetMember
          )
        } catch (error) {
          if (isExpectedMemberMutationError(error)) {
            recordMembershipSecurityEvent(ctx, 'membership_change_role_rejected', {
              entityId: memberId,
              metadata: {
                actorRole: actor.membershipRole,
                actorUserId: actor.userId,
                errorName: error.name,
                requestedRole: role,
                targetRole: target.role,
                targetUserId: target.userId,
              },
              tenantId,
              userId: ctx.authSession!.user.id,
            })
          }
          throw error
        }
      },
      role === 'admin' ? 'Member promoted to admin.' : 'Admin demoted to member.'
    )

    return ctx.response.redirect().toRoute('members.index')
  }
}

function isExpectedMemberMutationError(
  error: unknown
): error is
  | CannotAssignOwnerRoleError
  | CannotDeactivateSelfError
  | CannotModifyOwnerError
  | MemberNotFoundError {
  return (
    error instanceof CannotAssignOwnerRoleError ||
    error instanceof CannotDeactivateSelfError ||
    error instanceof CannotModifyOwnerError ||
    error instanceof MemberNotFoundError
  )
}

function recordMembershipSecurityEvent(
  ctx: HttpContext,
  event: string,
  options: {
    entityId: string
    metadata: Record<string, unknown>
    tenantId: string
    userId?: string
  }
): void {
  recordUserManagementActivityEvent(
    {
      entityId: options.entityId,
      entityType: 'member',
      event,
      level: 'warn',
      metadata: options.metadata,
      outcome: 'failure',
      tenantId: options.tenantId,
      userId: options.userId ?? ctx.authSession?.user.id ?? null,
    },
    new StructuredUserManagementActivitySink(ctx.logger)
  )
}
