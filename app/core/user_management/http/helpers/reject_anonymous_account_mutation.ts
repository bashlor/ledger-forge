import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicMessage } from '#core/common/http/presenters/inertia_public_error_presenter'

import { userManagementHttpLogger } from './activity_log.js'

export function rejectAnonymousAccountMutation(
  ctx: HttpContext,
  message: string,
  options?: { redirectTo?: string }
) {
  userManagementHttpLogger(ctx, {
    entityId: 'anonymous',
    entityType: 'user',
    metadata: { isAnonymous: true },
  }).warn('anonymous_mutation_rejected')

  return presentPublicMessage(ctx, message, {
    flashAll: true,
    redirectTo: options?.redirectTo,
  })
}
