export interface AppNavLink {
  href: string
  icon: string
  label: string
  permission?: keyof NavigationPermissions
}

export interface NavigationPermissions {
  canViewOrganization?: boolean
  canViewOverview?: boolean
}

export const mainNavLinks: readonly AppNavLink[] = [
  { href: '/dashboard', icon: 'dashboard', label: 'Overview', permission: 'canViewOverview' },
  { href: '/customers', icon: 'group', label: 'Customers' },
  { href: '/invoices', icon: 'receipt_long', label: 'Invoices' },
  /** Évite `payments` (carte / $) sur la ligne Dépenses — lu comme encaissement / facturation */
  { href: '/expenses', icon: 'shopping_bag', label: 'Expenses' },
  {
    href: '/organization',
    icon: 'business',
    label: 'Organization',
    permission: 'canViewOrganization',
  },
]

export const pageDescriptions: Record<string, string> = {
  Customers: 'Billable contacts available for invoicing.',
  'Dev Console': 'Internal operator console for tenant and audit checks.',
  'Dev Tools': 'Local bootstrap page for dev-only operator access.',
  Expenses: 'Recorded expenses that feed into profit.',
  Invoices: 'Create, issue, and settle customer invoices.',
  Organization: 'Review workspace members and recent audit activity.',
  Overview: 'Summary of revenue, expenses, and recent invoices.',
  Settings: 'Account and workspace preferences.',
}

export function isActive(currentUrl: string, href: string) {
  return currentUrl === href || currentUrl.startsWith(`${href}/`)
}

export function pageLabelForUrl(url: string) {
  if (isActive(url, '/_dev/inspector')) {
    return 'Dev Console'
  }

  if (isActive(url, '/_dev')) {
    return 'Dev Tools'
  }

  if (url.startsWith('/account')) {
    return 'Settings'
  }

  const match = mainNavLinks.find((link) => isActive(url, link.href))
  return match?.label ?? 'Overview'
}

/** Main app pages render an H1 via `PageHeader`; topbar should not repeat the same title. */
export function suppressPrimaryPageTitleInTopbar(url: string): boolean {
  if (url.startsWith('/account')) return false
  if (url.startsWith('/_dev')) return false
  if (url === '/dashboard') return true
  if (isActive(url, '/customers')) return true
  if (isActive(url, '/invoices')) return true
  if (isActive(url, '/expenses')) return true
  if (isActive(url, '/organization')) return true
  return false
}

export function visibleMainNavLinks(permissions?: NavigationPermissions): readonly AppNavLink[] {
  return mainNavLinks.filter((link) => !link.permission || permissions?.[link.permission] === true)
}
