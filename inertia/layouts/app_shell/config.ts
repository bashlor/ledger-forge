export const mainNavLinks = [
  { href: '/dashboard', icon: 'dashboard', label: 'Overview' },
  { href: '/customers', icon: 'business', label: 'Customers' },
  { href: '/invoices', icon: 'receipt_long', label: 'Invoices' },
  { href: '/expenses', icon: 'payments', label: 'Expenses' },
] as const

export const pageDescriptions: Record<string, string> = {
  Customers: 'Billable contacts available for invoicing.',
  'Dev Console': 'Internal operator console for tenant and audit checks.',
  'Dev Tools': 'Local bootstrap page for dev-only operator access.',
  Expenses: 'Recorded expenses that feed into profit.',
  Invoices: 'Create, issue, and settle customer invoices.',
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
