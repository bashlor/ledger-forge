import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import app from '@adonisjs/core/services/app'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

import '../../user_management/http/types/auth_session_context.js'
import '../../user_management/http/types/workspace_context.js'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }

  async share(ctx: HttpContext) {
    /**
     * The share method is called every time an Inertia page is rendered.
     * In some cases (e.g., 404), middleware may not have run yet, so
     * we must handle missing properties gracefully.
     */
    const { session } = ctx as Partial<HttpContext>

    const notification: null | { message: string; type: 'error' | 'success' } =
      session?.flashMessages.get('notification') ?? null
    const inputErrorsBag = this.getInputErrorsBag(ctx)

    /**
     * Auth session data — populated by SilentAuthMiddleware.
     * Shared with all Inertia pages for SSR/client-side rendering.
     */
    const authUser = ctx.authSession?.user
    const workspace = ctx.workspaceShare
    const devToolsEnvironment = await app.container.make(DevToolsEnvironmentService)
    const devToolsEnabled = devToolsEnvironment.isEnabled()
    const canAccessDevTools = await this.resolveDevToolsAccess(ctx, devToolsEnabled)
    /**
     * Inertia / http-transformers refuse top-level `null` for serialized props
     * (`Cannot serialize an item with null value`). Use `undefined` when there
     * is no active workspace so the key is omitted from the serialized payload.
     */
    const workspaceProps =
      workspace === null || workspace === undefined
        ? undefined
        : {
            id: workspace.id,
            isAnonymousWorkspace: workspace.isAnonymousWorkspace,
            name: workspace.name,
            slug: workspace.slug,
          }

    return {
      devTools: ctx.inertia.always({
        accessHref: '/_dev',
        canAccess: canAccessDevTools,
        enabled: devToolsEnabled,
      }),
      errors: ctx.inertia.always({
        ...this.getValidationErrors(ctx),
        ...inputErrorsBag,
      }),
      flash: ctx.inertia.always({
        notification,
      }),
      user: ctx.inertia.always(
        authUser
          ? {
              email: authUser.email,
              fullName: authUser.name,
              id: authUser.publicId,
              image: authUser.image ?? null,
              initials: this.getInitials(authUser.name, authUser.email),
              isAnonymous: authUser.isAnonymous,
            }
          : undefined
      ),
      workspace: ctx.inertia.always(workspaceProps),
    }
  }

  private getInitials(name: null | string, email: string): string {
    const [first, last] = name ? name.split(' ') : email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }

  private getInputErrorsBag(ctx: HttpContext): Record<string, string> {
    const candidate = ctx.session?.flashMessages.get('inputErrorsBag')

    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(candidate).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
  }

  private async resolveDevToolsAccess(
    ctx: HttpContext,
    devToolsEnabled: boolean
  ): Promise<boolean> {
    if (!devToolsEnabled || !ctx.authSession) {
      return false
    }

    const authorizationService = await app.container.make(AuthorizationService)
    const actor = await authorizationService.actorFromSession(ctx.authSession)
    return authorizationService.allows(actor, 'devTools.access')
  }
}

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends MiddlewareSharedProps {}
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
}
