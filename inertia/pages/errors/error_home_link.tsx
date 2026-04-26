import { Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { usePage } from '@inertiajs/react'

export function ErrorHomeLink() {
  const page = usePage<Data.SharedProps>()
  const href = resolveErrorHomeHref(page.props)

  return <Link href={href}>Go back home</Link>
}

export function resolveErrorHomeHref(props: Data.SharedProps): string {
  if (props.devTools?.enabled && props.devTools.canAccess) {
    return props.devTools.accessHref
  }

  if (props.permissions.canViewOverview) {
    return '/dashboard'
  }

  if (props.permissions.canReadAccounting) {
    return '/customers'
  }

  if (props.permissions.canViewOrganization) {
    return '/organization'
  }

  return props.user ? '/account' : '/signin'
}
