import { Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { usePage } from '@inertiajs/react'

interface ErrorHomeLinkProps {
  className?: string
}

export function ErrorHomeLink({ className }: ErrorHomeLinkProps) {
  const page = usePage<Data.SharedProps>()
  const href = resolveErrorHomeHref(page.props)

  return (
    <Link className={className} href={href}>
      Go back home
    </Link>
  )
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
