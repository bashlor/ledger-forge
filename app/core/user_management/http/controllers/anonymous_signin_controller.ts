import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { resolveInertiaMutation } from '../helpers/error_surface.js'
import { tryProvisionWorkspaceAfterAuth } from '../helpers/post_auth_workspace_bootstrap.js'
import { writeSessionToken } from '../session/session_token.js'

export default class AnonymousSigninController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    return resolveInertiaMutation(ctx, {
      action: async () => {
        const authentication = await auth.signInAnonymously()

        await tryProvisionWorkspaceAfterAuth(
          ctx,
          {
            isAnonymous: true,
            sessionToken: authentication.session.token,
            userId: authentication.user.id,
          },
          authentication.session.activeOrganizationId ?? null,
          'workspace_provision_on_anonymous_signin_failure'
        )

        writeSessionToken(ctx, {
          expiresAt: authentication.session.expiresAt,
          token: authentication.session.token,
        })
      },
      flashAll: true,
      redirectTo: '/dashboard',
    })
  }
}
