import { useId, useRef, useState } from 'react'

import type { InvoiceDto } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { useCloseOnOutsideAndEscape } from '~/hooks/use_close_on_outside_and_escape'
import { canDeleteInvoice, canEditInvoice, canIssueInvoice } from '~/lib/invoices'

interface InvoiceRowActionsMenuProps {
  invoice: InvoiceDto
  onDelete: (invoice: InvoiceDto) => void
  onEdit: (invoice: InvoiceDto) => void
  onIssue: (invoice: InvoiceDto) => void
  onOpen: (invoice: InvoiceDto) => void
  processing: boolean
  readOnly: boolean
}

interface MenuState {
  open: boolean
  step: MenuStep
}
type MenuStep = 'actions' | 'confirm-delete'

export function InvoiceRowActionsMenu({
  invoice,
  onDelete,
  onEdit,
  onIssue,
  onOpen,
  processing,
  readOnly,
}: InvoiceRowActionsMenuProps) {
  const [menuState, setMenuState] = useState<MenuState>({ open: false, step: 'actions' })
  const wrapRef = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const menuId = `${baseId}-menu`
  const confirmTitleId = `${baseId}-confirm-title`
  const menuOpen = menuState.open
  const step = menuState.step

  useCloseOnOutsideAndEscape(menuOpen, closeMenu, wrapRef)

  const editDisabled = processing || readOnly || !canEditInvoice(invoice)
  const issueDisabled = processing || readOnly || !canIssueInvoice(invoice)
  const deleteDisabled = processing || readOnly || !canDeleteInvoice(invoice)

  function toggleMenu() {
    setMenuState((state) => ({ open: !state.open, step: 'actions' }))
  }

  function closeMenu() {
    setMenuState({ open: false, step: 'actions' })
  }

  function showDeleteConfirmation() {
    setMenuState({ open: true, step: 'confirm-delete' })
  }

  return (
    <div className="relative flex justify-end" ref={wrapRef}>
      <button
        aria-controls={menuOpen ? menuId : undefined}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        aria-label={`Actions for invoice ${invoice.invoiceNumber}`}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 outline-hidden transition-colors duration-150 ease-out hover:border-slate-200/90 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-primary/25 ${
          menuOpen ? 'border-slate-200 bg-slate-100 text-slate-800' : ''
        }`}
        onClick={(event) => {
          event.stopPropagation()
          toggleMenu()
        }}
        type="button"
      >
        <AppIcon name="more_vert" size={20} />
      </button>

      {menuOpen ? (
        <div
          className={`absolute right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-lg shadow-slate-900/12 ring-1 ring-slate-900/[0.04] transition-[opacity,transform] duration-150 ease-out ${
            step === 'confirm-delete'
              ? 'w-[min(26rem,calc(100vw-2rem))] min-w-[20rem] max-w-[28rem] px-5 py-5 sm:px-6 sm:py-6'
              : 'min-w-[10.5rem] py-1'
          }`}
          id={menuId}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role={step === 'confirm-delete' ? 'dialog' : 'menu'}
          {...(step === 'confirm-delete'
            ? { 'aria-labelledby': confirmTitleId, 'aria-modal': true }
            : {})}
        >
          {step === 'actions' ? (
            <>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50"
                onClick={() => {
                  closeMenu()
                  onOpen(invoice)
                }}
                role="menuitem"
                type="button"
              >
                <AppIcon className="text-slate-500" name="monitoring" size={18} />
                Open
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={editDisabled}
                onClick={() => {
                  closeMenu()
                  onEdit(invoice)
                }}
                role="menuitem"
                type="button"
              >
                <AppIcon className="text-slate-500" name="edit" size={18} />
                Edit
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={issueDisabled}
                onClick={() => {
                  closeMenu()
                  onIssue(invoice)
                }}
                role="menuitem"
                type="button"
              >
                <AppIcon className="text-slate-500" name="send" size={18} />
                Issue
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-colors duration-150 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={deleteDisabled}
                onClick={() => {
                  if (deleteDisabled) return
                  showDeleteConfirmation()
                }}
                role="menuitem"
                type="button"
              >
                <AppIcon className="text-rose-500" name="delete" size={18} />
                Delete draft
              </button>
            </>
          ) : (
            <div className="space-y-1">
              <p
                className="text-[15px] font-medium leading-relaxed text-slate-800"
                id={confirmTitleId}
              >
                Delete draft invoice{' '}
                <span className="font-semibold text-slate-950">
                  &ldquo;{invoice.invoiceNumber}&rdquo;
                </span>
                ?
              </p>
              <p className="text-sm leading-relaxed text-slate-600">This cannot be undone.</p>
              <div className="flex flex-wrap justify-end gap-2.5 pt-4">
                <button
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-100"
                  onClick={() => setMenuState({ open: true, step: 'actions' })}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  aria-label="Confirm delete draft invoice"
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-900/15 transition-colors duration-150 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={processing}
                  onClick={() => {
                    closeMenu()
                    onDelete(invoice)
                  }}
                  type="button"
                >
                  Delete draft
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
