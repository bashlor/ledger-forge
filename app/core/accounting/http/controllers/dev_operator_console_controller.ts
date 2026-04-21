import type { HttpContext } from '@adonisjs/core/http'

import { DevOperatorConsoleService } from '#core/accounting/application/dev_operator_console_service'
import { isDevOperatorActionName } from '#core/accounting/application/dev_operator_console_service'
import { DomainError } from '#core/common/errors/domain_error'
import { resolvePublicError } from '#core/common/errors/public_error'
import { flashResolvedPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
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
        tenantId: stringInput(ctx, 'tenantId'),
      }),
    })
  }

  @inject()
  async runAction(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    consoleService: DevOperatorConsoleService,
    devToolsEnvironment: DevToolsEnvironmentService
  ) {
    devToolsEnvironment.ensureEnabled()

    const actor = await authorizationService.actorFromSession(ctx.authSession)
    authorizationService.authorize(actor, 'devTools.access')

    const action = String(ctx.params.action ?? '').trim()
    if (!isDevOperatorActionName(action)) {
      throw new DomainError('Unknown dev console action.', 'invalid_data')
    }

    await runConsoleAction(ctx, async () => {
      const message = await consoleService.runAction(ctx.authSession!, action, authorizationService)
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

function redirectBackToInspector(ctx: HttpContext) {
  const query: Record<string, string> = {}
  const action = stringInput(ctx, 'action')
  const actorId = stringInput(ctx, 'actorId')
  const tenantId = stringInput(ctx, 'tenantId')

  if (action) query.action = action
  if (actorId) query.actorId = actorId
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
