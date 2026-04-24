import type { PublicErrorOptions } from '#core/common/errors/public_error'
import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'

interface FormMutationErrorOptions {
  flashAll?: boolean
  redirectTo?: string
}

/**
 * Standard user-management policy for HTML/Inertia form mutations:
 * convert failures into flashed public errors and keep the visitor in flow.
 */
export async function runInertiaFormMutation<T>(
  ctx: HttpContext,
  action: () => Promise<T>,
  options?: FormMutationErrorOptions & Pick<PublicErrorOptions, 'errorKey'>
) {
  try {
    return await action()
  } catch (error) {
    return presentPublicError(ctx, error, options)
  }
}
