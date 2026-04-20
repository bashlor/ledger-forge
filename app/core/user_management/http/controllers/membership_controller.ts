import type { HttpContext } from '@adonisjs/core/http'

import { flashAction } from '#core/accounting/http/helpers/flash_action'
import { inject } from '@adonisjs/core'

import { MemberService } from '../../application/member_service.js'
import { toggleMemberStatusValidator } from '../validators/member.js'

export default class MembershipController {
  /**
   * GET /account/organizations/members
   * Returns the list of members in the active organization as JSON.
   * Requires admin or owner role.
   */
  @inject()
  async index(ctx: HttpContext, memberService: MemberService) {
    const tenantId = ctx.authSession!.session.activeOrganizationId!
    const actorId = ctx.authSession!.user.id

    const members = await memberService.listMembers(tenantId, actorId)
    return ctx.response.ok(members)
  }

  /**
   * PATCH /account/organizations/members/:memberId
   * Activate or deactivate a membership.
   * Requires admin or owner role, with additional guards enforced by MemberService.
   */
  @inject()
  async toggleActive(ctx: HttpContext, memberService: MemberService) {
    const memberId = ctx.params.memberId as string
    const tenantId = ctx.authSession!.session.activeOrganizationId!
    const actorId = ctx.authSession!.user.id
    const { isActive } = await ctx.request.validateUsing(toggleMemberStatusValidator)

    await flashAction(
      ctx,
      () => memberService.toggleMemberActive(memberId, isActive, tenantId, actorId),
      isActive ? 'Member activated.' : 'Member deactivated.'
    )

    return ctx.response.redirect().toRoute('members.index')
  }
}
