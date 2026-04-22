import type { HttpContext } from '@adonisjs/core/http'

import { DomainError } from '#core/common/errors/domain_error'
import { resolvePublicError } from '#core/common/errors/public_error'
import { flashResolvedPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { presentPublicMessage } from '#core/common/http/presenters/inertia_public_error_presenter'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { DevOperatorConsoleService } from '#core/dev_tools/application/dev_operator_console_service'
import { isDevOperatorActionName } from '#core/dev_tools/application/dev_operator_console_service'
import { createDevTenantValidator } from '#core/dev_tools/http/validators/dev_operator'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import { AuthenticationPort } from '#core/user_management/domain/authentication'
import { readSessionToken } from '#core/user_management/http/session/session_token'
import { inject } from '@adonisjs/core'

export default class DevOperatorConsoleController {
  @inject()
  async index(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    consoleService: DevOperatorConsoleService,
    devToolsEnvironment: DevToolsEnvironmentService
  ) {
    devToolsEnvironment.ensureEnabled()

    const actor = await authorizationService.actorFromSession(ctx.authSession)
    authorizationService.authorize(actor, 'devTools.access')

    return renderInertiaPage(ctx.inertia, 'dev/inspector', {
      inspector: await consoleService.getPageData(ctx.authSession!, authorizationService, {
        action: stringInput(ctx, 'action'),
        actorId: stringInput(ctx, 'actorId'),
        auditSearch: stringInput(ctx, 'auditSearch'),
        expenseId: stringInput(ctx, 'expenseId'),
        invoiceId: stringInput(ctx, 'invoiceId'),
        memberId: stringInput(ctx, 'memberId'),
        memberRole: stringInput(ctx, 'memberRole'),
        memberSearch: stringInput(ctx, 'memberSearch'),
        memberStatus: stringInput(ctx, 'memberStatus'),
        probeType: stringInput(ctx, 'probeType'),
        selectedRecordId: stringInput(ctx, 'selectedRecordId'),
        tab: stringInput(ctx, 'tab'),
        tenantId: stringInput(ctx, 'tenantId'),
      }),
    })
  }

  @inject()
  async runAction(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    consoleService: DevOperatorConsoleService,
    devToolsEnvironment: DevToolsEnvironmentService,
    auth: AuthenticationPort
  ) {
    devToolsEnvironment.ensureEnabled()

    const actor = await authorizationService.actorFromSession(ctx.authSession)
    authorizationService.authorize(actor, 'devTools.access')

    const action = String(ctx.params.action ?? '').trim()
    if (!isDevOperatorActionName(action)) {
      presentPublicMessage(ctx, 'Unknown dev console action.')
      return redirectBackToInspector(ctx)
    }

    const createTenantPayload =
      action === 'create-tenant'
        ? await ctx.request.validateUsing(createDevTenantValidator)
        : undefined

    await runConsoleAction(ctx, async () => {
      const message = await consoleService.runAction(
        ctx.authSession!,
        action,
        authorizationService,
        {
          count: numberInput(ctx, 'count'),
          customerId: stringInput(ctx, 'customerId'),
          expenseId: stringInput(ctx, 'expenseId'),
          invoiceId: stringInput(ctx, 'invoiceId'),
          memberId: stringInput(ctx, 'memberId'),
          ownerEmail: createTenantPayload?.ownerEmail,
          ownerPassword: createTenantPayload?.ownerPassword,
          seedMode: createTenantPayload?.seedMode,
          tab: stringInput(ctx, 'tab'),
          tenantId: stringInput(ctx, 'tenantId'),
          tenantName: createTenantPayload?.tenantName,
        },
        auth
      )
      ctx.session.flash('notification', { message, type: 'success' })
    })

    return redirectBackToInspector(ctx)
  }

  @inject()
  async switchActiveTenant(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    consoleService: DevOperatorConsoleService,
    devToolsEnvironment: DevToolsEnvironmentService
  ) {
    devToolsEnvironment.ensureEnabled()

    const actor = await authorizationService.actorFromSession(ctx.authSession)
    authorizationService.authorize(actor, 'devTools.access')

    const tenantId = String(ctx.request.input('tenantId') ?? '').trim()
    const sessionToken = readSessionToken(ctx)
    if (!tenantId || !sessionToken) {
      ctx.session.flash('notification', {
        message: 'Active tenant could not be changed from this session.',
        type: 'error',
      })
      return redirectBackToInspector(ctx)
    }

    await runConsoleAction(ctx, async () => {
      await consoleService.switchActiveTenant(ctx.authSession!, sessionToken, tenantId)
      ctx.session.flash('notification', { message: 'Active tenant updated.', type: 'success' })
    })

    return redirectBackToInspector(ctx)
  }
}

function numberInput(ctx: HttpContext, key: string): number | undefined {
  const raw = String(ctx.request.input(key) ?? '').trim()
  if (!raw) {
    return undefined
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function redirectBackToInspector(ctx: HttpContext) {
  const query: Record<string, string> = {}
  const action = stringInput(ctx, 'action')
  const actorId = stringInput(ctx, 'actorId')
  const auditSearch = stringInput(ctx, 'auditSearch')
  const expenseId = stringInput(ctx, 'expenseId')
  const invoiceId = stringInput(ctx, 'invoiceId')
  const memberId = stringInput(ctx, 'memberId')
  const memberRole = stringInput(ctx, 'memberRole')
  const memberSearch = stringInput(ctx, 'memberSearch')
  const memberStatus = stringInput(ctx, 'memberStatus')
  const probeType = stringInput(ctx, 'probeType')
  const selectedRecordId = stringInput(ctx, 'selectedRecordId')
  const tab = stringInput(ctx, 'tab')
  const tenantId = stringInput(ctx, 'tenantId')

  if (action) query.action = action
  if (actorId) query.actorId = actorId
  if (auditSearch) query.auditSearch = auditSearch
  if (expenseId) query.expenseId = expenseId
  if (invoiceId) query.invoiceId = invoiceId
  if (memberId) query.memberId = memberId
  if (memberRole) query.memberRole = memberRole
  if (memberSearch) query.memberSearch = memberSearch
  if (memberStatus) query.memberStatus = memberStatus
  if (probeType) query.probeType = probeType
  if (selectedRecordId) query.selectedRecordId = selectedRecordId
  if (tab) query.tab = tab
  if (tenantId) query.tenantId = tenantId

  return ctx.response
    .redirect()
    .toRoute('dev.inspector', [], Object.keys(query).length > 0 ? { qs: query } : undefined)
}

async function runConsoleAction(ctx: HttpContext, action: () => Promise<void>): Promise<void> {
  try {
    await action()
  } catch (error) {
    if (!(error instanceof DomainError) || error.type === 'not_found') {
      throw error
    }

    flashResolvedPublicError(ctx, resolvePublicError(error))
  }
}

function stringInput(ctx: HttpContext, key: string): string {
  return String(ctx.request.input(key) ?? '').trim()
}
