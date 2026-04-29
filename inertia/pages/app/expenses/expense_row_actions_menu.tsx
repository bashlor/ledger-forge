import { useId, useRef, useState } from 'react'

import type { ExpenseDto } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { useCloseOnOutsideAndEscape } from '~/hooks/use_close_on_outside_and_escape'

interface ExpenseRowActionsMenuProps {
  expense: ExpenseDto
  onConfirm: (id: string) => void
  onDelete: (expense: ExpenseDto) => void
  onOpen: (expense: ExpenseDto) => void
  processing: boolean
  readOnly: boolean
}

interface MenuState {
  open: boolean
  step: MenuStep
}
type MenuStep = 'actions' | 'confirm-delete'

export function ExpenseRowActionsMenu({
  expense,
  onConfirm,
  onDelete,
  onOpen,
  processing,
  readOnly,
}: ExpenseRowActionsMenuProps) {
  const [menuState, setMenuState] = useState<MenuState>({ open: false, step: 'actions' })
  const wrapRef = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const menuId = `${baseId}-menu`
  const confirmTitleId = `${baseId}-confirm-title`
  const menuOpen = menuState.open
  const step = menuState.step

  useCloseOnOutsideAndEscape(menuOpen, closeMenu, wrapRef)

  const confirmDisabled = processing || readOnly || !expense.canConfirm
  const deleteDisabled = processing || readOnly || !expense.canDelete
  const canEditDraft = !readOnly && expense.canEdit
  const primaryActionIsEdit = expense.status === 'draft' && canEditDraft

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
        aria-label={`Actions for expense ${expense.label}`}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 outline-hidden transition-colors duration-150 ease-out hover:border-slate-200/90 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-primary/25 ${
          menuOpen ? 'border-slate-200 bg-slate-100 text-slate-800' : ''
        }`}
        disabled={processing}
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
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={processing}
                onClick={() => {
                  closeMenu()
                  onOpen(expense)
                }}
                role="menuitem"
                type="button"
              >
                <AppIcon
                  className="text-slate-500"
                  name={primaryActionIsEdit ? 'edit' : 'monitoring'}
                  size={18}
                />
                {primaryActionIsEdit ? 'Edit' : 'Open'}
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={confirmDisabled}
                onClick={() => {
                  closeMenu()
                  onConfirm(expense.id)
                }}
                role="menuitem"
                type="button"
              >
                <AppIcon className="text-slate-500" name="task_alt" size={18} />
                Confirm
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
                Delete draft expense{' '}
                <span className="font-semibold text-slate-950">&ldquo;{expense.label}&rdquo;</span>?
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
                  aria-label="Confirm delete draft expense"
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-900/15 transition-colors duration-150 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={processing}
                  onClick={() => {
                    closeMenu()
                    onDelete(expense)
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
