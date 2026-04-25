import type { ComponentPropsWithoutRef } from 'react'

export function TableHeaderCell({
  className,
  scope = 'col',
  ...props
}: ComponentPropsWithoutRef<'th'>) {
  return <th className={`table-head-cell ${className ?? ''}`.trim()} scope={scope} {...props} />
}

export function TableHeadRow({ className, ...props }: ComponentPropsWithoutRef<'tr'>) {
  return <tr className={`table-head-row ${className ?? ''}`.trim()} {...props} />
}
