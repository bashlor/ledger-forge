import type { MembershipAuthorizationSubject } from '#core/user_management/authorization/authorizer'
import type { HttpContext } from '@adonisjs/core/http'

import { AuthorizationDeniedError } from '#core/user_management/application/authorization_service'
import {
  CannotAssignOwnerRoleError,
  CannotDeactivateSelfError,
  CannotModifyOwnerError,
  type MemberMutationTarget,
  MemberNotFoundError,
} from '#core/user_management/application/member_service'

import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '../../support/activity_log.js'

export function recordMembershipSecurityEvent(
  ctx: HttpContext,
  event: string,
  options: {
    entityId: string
    metadata: Record<string, unknown>
    tenantId: string
    userId?: string
  }
): void {
  recordUserManagementActivityEvent(
    {
      entityId: options.entityId,
      entityType: 'member',
      event,
      level: 'warn',
      metadata: options.metadata,
      outcome: 'failure',
      tenantId: options.tenantId,
      userId: options.userId ?? ctx.authSession?.user.id ?? null,
    },
    new StructuredUserManagementActivitySink(ctx.logger)
  )
}

/**
 * Preserves the controller's two-phase guard: authorization (log deny) then
 * service mutation (log expected business rejections). Re-throws in both cases.
 */
export async function runMemberMutationWithGuards(options: {
  assertAuthorized: () => void
  onAuthorizationDenied: () => void
  onExpectedMutationRejection: (error: unknown) => void
  runMutation: () => Promise<void>
}): Promise<void> {
  try {
    options.assertAuthorized()
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) {
      options.onAuthorizationDenied()
    }
    throw error
  }

  try {
    await options.runMutation()
  } catch (error) {
    if (isExpectedMemberMutationError(error)) {
      options.onExpectedMutationRejection(error)
    }
    throw error
  }
}

export function toMemberMutationTarget(
  subject: MembershipAuthorizationSubject
): MemberMutationTarget {
  return {
    id: subject.id,
    isActive: subject.isActive,
    role: subject.role,
    userId: subject.userId,
  }
}

function isExpectedMemberMutationError(
  error: unknown
): error is
  | CannotAssignOwnerRoleError
  | CannotDeactivateSelfError
  | CannotModifyOwnerError
  | MemberNotFoundError {
  return (
    error instanceof CannotAssignOwnerRoleError ||
    error instanceof CannotDeactivateSelfError ||
    error instanceof CannotModifyOwnerError ||
    error instanceof MemberNotFoundError
  )
}
