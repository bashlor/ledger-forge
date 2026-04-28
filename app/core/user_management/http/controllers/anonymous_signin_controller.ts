import type { HttpContext } from '@adonisjs/core/http'

import { DomainError } from '#core/common/errors/domain_error'
import { isAnonymousDemoAuthEnabled } from '#core/user_management/support/demo_mode'
import { inject } from '@adonisjs/core'

import { UserManagementAuditTrail } from '../../application/audit/user_management_audit_trail.js'
import { AuthenticationPort } from '../../domain/authentication.js'
import { resolveInertiaMutation } from '../helpers/error_surface.js'
import { tryProvisionAnonymousDemoWorkspaceAfterAuth } from '../helpers/post_auth_workspace_bootstrap.js'
import { writeSessionToken } from '../session/session_token.js'

export default class AnonymousSigninController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort, auditTrail: UserManagementAuditTrail) {
    return resolveInertiaMutation(ctx, {
      action: async () => {
        if (!isAnonymousDemoAuthEnabled()) {
          throw new DomainError('Anonymous sign-in is only available in demo mode.', 'forbidden')
        }

        const authentication = await auth.signInAnonymously()

        await tryProvisionAnonymousDemoWorkspaceAfterAuth(
          ctx,
          {
            sessionToken: authentication.session.token,
            userId: authentication.user.id,
          },
          authentication.session.activeOrganizationId ?? null,
          'workspace_provision_on_anonymous_signin_failure'
        )

        await auditTrail.recordSignInSuccess({
          isAnonymous: true,
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
