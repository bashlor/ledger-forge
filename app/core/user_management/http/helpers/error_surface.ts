import type { PublicErrorOptions } from '#core/common/errors/public_error'
import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'

const DEFAULT_INERTIA_MUTATION_ERROR_MESSAGE = 'The requested action could not be completed.'

interface InertiaMutationOptions<T> extends Pick<
  PublicErrorOptions,
  'errorKey' | 'fallbackErrorMessage'
> {
  action: () => Promise<T>
  errorRedirectTo?: string
  flashAll?: boolean
  redirectTo?: string
  successMessage?: string
}

/**
 * Standard user-management policy for HTML/Inertia form mutations:
 * convert failures into flashed public errors, and optionally resolve successful
 * mutations into the shared notification + redirect surface.
 */
export async function resolveInertiaMutation<T>(
  ctx: HttpContext,
  options: InertiaMutationOptions<T>
) {
  try {
    const result = await options.action()

    if (options.successMessage) {
      ctx.session.flash('notification', {
        message: options.successMessage,
        type: 'success',
      })
    }

    if (options.redirectTo || options.successMessage) {
      return ctx.response.redirect().toPath(options.redirectTo ?? ctx.request.url())
    }

    return result
  } catch (error) {
    return presentPublicError(ctx, error, {
      errorKey: options.errorKey,
      fallbackErrorMessage: options.fallbackErrorMessage ?? DEFAULT_INERTIA_MUTATION_ERROR_MESSAGE,
      flashAll: options.flashAll,
      redirectTo: options.errorRedirectTo,
    })
  }
}
