import type { HttpContext } from '@adonisjs/core/http'

import type { UserManagementAuditTrail } from '../../application/audit/user_management_audit_trail.js'
import type { AuthenticationPort, AuthResult } from '../../domain/authentication.js'

import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '../../support/activity_log.js'
import { readSessionToken } from '../session/session_token.js'

export async function signInWithAudit(
  auth: AuthenticationPort,
  auditTrail: UserManagementAuditTrail,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    return await auth.signIn(email, password)
  } catch (error) {
    await auditTrail.recordSignInFailure({ email, error })
    throw error
  }
}

export async function signOutWithAudit(
  ctx: HttpContext,
  auth: AuthenticationPort,
  auditTrail: UserManagementAuditTrail
): Promise<void> {
  const sessionToken = readSessionToken(ctx)
  const isAnonymous = ctx.authSession?.user.isAnonymous ?? false
  const auditContext = await auditTrail.resolveSessionContext(sessionToken)

  try {
    if (!sessionToken) {
      recordSignOutMissingSession(ctx, isAnonymous)
      return
    }

    await auth.signOut(sessionToken)
    await auditTrail.recordSignOutSuccess({
      context: auditContext,
      isAnonymous,
    })
  } catch (error) {
    await auditTrail.recordSignOutFailure({
      context: auditContext,
      email: ctx.authSession?.user.email ?? null,
      error,
      isAnonymous,
    })
    recordSignOutFailure(ctx, error, isAnonymous)
  }
}

function recordSignOutFailure(ctx: HttpContext, error: unknown, isAnonymous: boolean) {
  recordUserManagementActivityEvent(
    {
      entityId: ctx.authSession?.user.id ?? 'authentication',
      entityType: 'auth',
      event: 'sign_out_failure',
      level: 'error',
      metadata: {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        isAnonymous,
      },
      outcome: 'failure',
      tenantId: ctx.authSession?.session.activeOrganizationId ?? null,
      userId: ctx.authSession?.user.id ?? null,
    },
    new StructuredUserManagementActivitySink(ctx.logger)
  )
}

function recordSignOutMissingSession(ctx: HttpContext, isAnonymous: boolean) {
  recordUserManagementActivityEvent(
    {
      entityId: 'authentication',
      entityType: 'auth',
      event: 'sign_out_missing_session',
      level: 'warn',
      metadata: { isAnonymous },
      outcome: 'failure',
      tenantId: ctx.authSession?.session.activeOrganizationId ?? null,
      userId: ctx.authSession?.user.id ?? null,
    },
    new StructuredUserManagementActivitySink(ctx.logger)
  )
}
