import type { HttpContext } from '@adonisjs/core/http'

import { isAnonymousDemoAuthEnabled } from '#core/user_management/support/demo_mode'
import { inject } from '@adonisjs/core'

import { UserManagementAuditTrail } from '../../application/audit/user_management_audit_trail.js'
import { AuthenticationPort } from '../../domain/authentication.js'
import { signInWithAudit } from '../helpers/auth_audit.js'
import { resolveInertiaMutation } from '../helpers/error_surface.js'
import { tryProvisionWorkspaceAfterAuth } from '../helpers/post_auth_workspace_bootstrap.js'
import { writeSessionToken } from '../session/session_token.js'
import { loginValidator } from '../validators/user.js'

export default class SigninController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/signin', {
      allowAnonymousAuth: isAnonymousDemoAuthEnabled(),
    })
  }

  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort, auditTrail: UserManagementAuditTrail) {
    const { email, password } = await ctx.request.validateUsing(loginValidator)

    return resolveInertiaMutation(ctx, {
      action: async () => {
        const authentication = await signInWithAudit(auth, auditTrail, email, password)

        await tryProvisionWorkspaceAfterAuth(
          ctx,
          {
            displayName: authentication.user.name ?? undefined,
            email: authentication.user.email,
            isAnonymous: authentication.user.isAnonymous,
            sessionToken: authentication.session.token,
            userId: authentication.user.id,
          },
          authentication.session.activeOrganizationId ?? null,
          'workspace_provision_on_signin_failure'
        )

        await auditTrail.recordSignInSuccess({
          isAnonymous: authentication.user.isAnonymous,
          sessionToken: authentication.session.token,
          userId: authentication.user.id,
        })

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
