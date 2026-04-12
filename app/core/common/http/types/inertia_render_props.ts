import type { HttpContext } from '@adonisjs/core/http'

type InertiaPages = import('@adonisjs/inertia/types').InertiaPages

/**
 * Inertia server-side rendering.
 *
 * `indexPages` populates `InertiaPages` with the type `FC<InertiaProps<…>>` (with always-included shared props, etc.).
 * The second argument to `inertia.render` then becomes `never` in TypeScript.
 * We type `props` by inferring from the passed object (DTO store and React props may differ slightly, as long as they're serializable).
 */
export function renderInertiaPage<
  Page extends keyof InertiaPages & string,
  Props extends Record<string, unknown>,
>(inertia: HttpContext['inertia'], page: Page, props: Props) {
  return inertia.render(page, props as never)
}
