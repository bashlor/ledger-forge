import type { HttpContext } from '@adonisjs/core/http'

import { inject } from '@adonisjs/core'

import { UserManagementAuditTrail } from '../../application/audit/user_management_audit_trail.js'
import { AuthenticationPort } from '../../domain/authentication.js'
import { signOutWithAudit } from '../helpers/auth_audit.js'
import { clearSessionToken } from '../session/session_token.js'

export default class SignoutController {
  @inject()
  async store(ctx: HttpContext, auth: AuthenticationPort, auditTrail: UserManagementAuditTrail) {
    await signOutWithAudit(ctx, auth, auditTrail)
    clearSessionToken(ctx)
    return ctx.response.redirect('/')
  }
}
