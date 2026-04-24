import type { HttpContext } from '@adonisjs/core/http'

import { flashAction } from '#core/accounting/http/helpers/flash_action'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { inject } from '@adonisjs/core'

import {
  type MemberMutationTarget,
  MemberNotFoundError,
  MemberService,
} from '../../application/member_service.js'
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

    authorizationService.authorize(actor, 'membership.list')

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
        authorizationService.authorize(actor, 'membership.toggleActive', target)

        await memberService.toggleMemberActive(memberId, isActive, tenantId, actorId, targetMember)
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
        authorizationService.authorize(actor, 'membership.changeRole', target)

        await memberService.updateMemberRole(
          memberId,
          role,
          tenantId,
          ctx.authSession!.user.id,
          targetMember
        )
      },
      role === 'admin' ? 'Member promoted to admin.' : 'Admin demoted to member.'
    )

    return ctx.response.redirect().toRoute('members.index')
  }
}
