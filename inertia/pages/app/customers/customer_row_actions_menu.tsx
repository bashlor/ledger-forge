import { useId, useRef, useState } from 'react'

import type { CustomerListItemDto } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { useCloseOnOutsideAndEscape } from '~/hooks/use_close_on_outside_and_escape'

interface CustomerRowActionsMenuProps {
  customer: CustomerListItemDto
  onDelete: (customer: CustomerListItemDto) => void
  onEdit: (customer: CustomerListItemDto) => void
  onView: (customer: CustomerListItemDto) => void
  processing: boolean
  readOnly: boolean
}

export function CustomerRowActionsMenu({
  customer,
  onDelete,
  onEdit,
  onView,
  processing,
  readOnly,
}: CustomerRowActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const menuId = `${baseId}-menu`

  useCloseOnOutsideAndEscape(open, setOpen, wrapRef)

  const deleteDisabled = processing || readOnly || customer.canDelete === false

  return (
    <div className="relative flex justify-end" ref={wrapRef}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${customer.company}`}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 outline-hidden transition-colors duration-150 ease-out hover:border-slate-200/90 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-primary/25 ${
          open ? 'border-slate-200 bg-slate-100 text-slate-800' : ''
        }`}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((o) => !o)
        }}
        type="button"
      >
        <AppIcon name="more_vert" size={20} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-slate-200/95 bg-white py-1 shadow-lg shadow-slate-900/12 ring-1 ring-slate-900/[0.04] transition-[opacity,transform] duration-150 ease-out"
          id={menuId}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="menu"
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50"
            onClick={() => {
              setOpen(false)
              onView(customer)
            }}
            role="menuitem"
            type="button"
          >
            <AppIcon className="text-slate-500" name="monitoring" size={18} />
            View
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={readOnly}
            onClick={() => {
              setOpen(false)
              onEdit(customer)
            }}
            role="menuitem"
            type="button"
          >
            <AppIcon className="text-slate-500" name="edit" size={18} />
            Edit
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-colors duration-150 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={deleteDisabled}
            onClick={() => {
              setOpen(false)
              onDelete(customer)
            }}
            role="menuitem"
            title={customer.deleteBlockReason}
            type="button"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}
