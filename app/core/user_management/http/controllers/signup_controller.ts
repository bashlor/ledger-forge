import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { AuthenticationPort } from '../../domain/authentication.js'
import { resolveInertiaMutation } from '../helpers/error_surface.js'
import { tryProvisionWorkspaceAfterAuth } from '../helpers/post_auth_workspace_bootstrap.js'
import { writeSessionToken } from '../session/session_token.js'
import { signupValidator } from '../validators/user.js'

export default class SignupController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort) {
    const { email, fullName, password } = await ctx.request.validateUsing(signupValidator)

    return resolveInertiaMutation(ctx, {
      action: async () => {
        const authentication = await auth.signUp(email, password, fullName ?? undefined)

        await tryProvisionWorkspaceAfterAuth(
          ctx,
          {
            displayName: fullName ?? undefined,
            email,
            isAnonymous: false,
            sessionToken: authentication.session.token,
            userId: authentication.user.id,
          },
          authentication.session.activeOrganizationId ?? null,
          'workspace_provision_on_signup_failure'
        )

        writeSessionToken(ctx, {
          expiresAt: authentication.session.expiresAt,
          token: authentication.session.token,
        })
      },
      errorKey: 'E_SIGNUP_ERROR',
      flashAll: true,
      redirectTo: '/',
    })
  }
}
