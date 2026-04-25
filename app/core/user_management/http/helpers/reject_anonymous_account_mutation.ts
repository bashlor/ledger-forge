import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicMessage } from '#core/common/http/presenters/inertia_public_error_presenter'

import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '../../support/activity_log.js'

export function rejectAnonymousAccountMutation(
  ctx: HttpContext,
  message: string,
  options?: { redirectTo?: string }
) {
  recordUserManagementActivityEvent(
    {
      entityId: 'anonymous',
      entityType: 'user',
      event: 'anonymous_mutation_rejected',
      level: 'warn',
      metadata: { isAnonymous: true },
      outcome: 'failure',
      tenantId: ctx.authSession?.session.activeOrganizationId ?? null,
      userId: ctx.authSession?.user.id ?? null,
    },
    new StructuredUserManagementActivitySink(ctx.logger)
  )

  return presentPublicMessage(ctx, message, {
    flashAll: true,
    redirectTo: options?.redirectTo,
  })
}
