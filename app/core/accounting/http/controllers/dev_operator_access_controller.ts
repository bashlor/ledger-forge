import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { DevOperatorBootstrapService } from '#core/user_management/application/dev_operator_bootstrap_service'
import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import { AuthenticationPort } from '#core/user_management/domain/authentication'
import { writeSessionToken } from '#core/user_management/http/session/session_token'
import { devOperatorBootstrapValidator } from '#core/user_management/http/validators/user'
import { inject } from '@adonisjs/core'

export default class DevOperatorAccessController {
  @inject()
  async show(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    bootstrapService: DevOperatorBootstrapService,
    devToolsEnvironment: DevToolsEnvironmentService
  ) {
    devToolsEnvironment.ensureEnabled()

    if (ctx.authSession) {
      const actor = await authorizationService.actorFromSession(ctx.authSession)
      if (authorizationService.allows(actor, 'devTools.access')) {
        return ctx.response.redirect('/_dev/inspector')
      }
    }

    return renderInertiaPage(ctx.inertia, 'dev/access', {
      bootstrap: {
        currentUser: ctx.authSession
          ? {
              email: ctx.authSession.user.email,
              fullName: ctx.authSession.user.name,
            }
          : null,
        defaults: bootstrapService.defaults(),
      },
    })
  }

  @inject()
  async store(
    ctx: HttpContext,
    auth: AuthenticationPort,
    bootstrapService: DevOperatorBootstrapService,
    devToolsEnvironment: DevToolsEnvironmentService
  ) {
    devToolsEnvironment.ensureEnabled()

    const payload = await ctx.request.validateUsing(devOperatorBootstrapValidator)
    const finalizeBootstrap = (
      authentication: Awaited<ReturnType<DevOperatorBootstrapService['bootstrap']>>
    ) => {
      writeSessionToken(ctx, {
        expiresAt: authentication.session.expiresAt,
        token: authentication.session.token,
      })

      ctx.session.flash('notification', {
        message: 'Local dev operator is ready.',
        type: 'success',
      })

      return ctx.response.redirect('/_dev/inspector')
    }

    try {
      const authentication = await bootstrapService.bootstrap(payload, auth)
      return finalizeBootstrap(authentication)
    } catch (error) {
      try {
        // Better Auth sign-up can leave a usable account/session behind before a later
        // local workspace grant step fails. Re-running the bootstrap is safe and lets
        // the existing user complete the dev-operator provisioning path.
        const recovered = await bootstrapService.bootstrap(payload, auth)
        return finalizeBootstrap(recovered)
      } catch {
        // Fall through to the original public error below.
      }

      return presentPublicError(ctx, error, { flashAll: true })
    }
  }
}
