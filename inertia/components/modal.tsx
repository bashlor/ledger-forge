import type { ReactNode } from 'react'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

import { AppIcon } from '~/components/app_icon'

interface ModalProps {
  children: ReactNode
  description?: string
  footer?: ReactNode
  onClose: () => void
  open: boolean
  size?: 'lg' | 'md' | 'sm'
  title: string
}

const sizeClasses = {
  lg: 'max-w-3xl',
  md: 'max-w-xl',
  sm: 'max-w-md',
} as const

export function Modal({
  children,
  description,
  footer,
  onClose,
  open,
  size = 'md',
  title,
}: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      previousFocusedElementRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(dialogRef.current)
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      const focusIsInsideDialog = activeElement ? dialogRef.current?.contains(activeElement) : false

      if (event.shiftKey) {
        if (!focusIsInsideDialog || activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
        return
      }

      if (!focusIsInsideDialog || activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[60] bg-on-surface/18 backdrop-blur-[4px]"
        onClick={onClose}
      />
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="pointer-events-none fixed inset-0 z-[70] overflow-y-auto p-3 sm:p-6"
        role="dialog"
      >
        <div className="flex min-h-full items-center justify-center">
          <div
            className={`pointer-events-auto relative w-full overflow-hidden rounded-[1.75rem] border border-border-default bg-surface-container-lowest shadow-ambient ring-1 ring-black/[0.04] ${sizeClasses[size]}`}
            onClick={(event) => event.stopPropagation()}
            ref={dialogRef}
            tabIndex={-1}
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/55 to-transparent"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-6 top-0 h-px bg-border-hairline"
            />

            <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto px-6 pb-6 pt-6 sm:max-h-[calc(100dvh-5rem)] sm:px-7 sm:pb-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border-hairline bg-surface-container-low px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Workspace control
                  </div>
                  <h2
                    className="mt-4 font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-[1.7rem]"
                    id={titleId}
                  >
                    {title}
                  </h2>
                  {description ? (
                    <p
                      className="mt-3 max-w-[34rem] text-sm leading-7 text-on-surface-variant sm:text-[15px]"
                      id={descriptionId}
                    >
                      {description}
                    </p>
                  ) : null}
                </div>

                <button
                  aria-label="Close dialog"
                  className="shrink-0 rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                  onClick={onClose}
                  ref={closeButtonRef}
                  type="button"
                >
                  <AppIcon name="close" size={18} />
                </button>
              </div>

              <div className="mt-6">{children}</div>

              {footer ? (
                <>
                  <div aria-hidden="true" className="mt-6 border-t border-border-hairline" />
                  <div className="mt-6 flex flex-wrap items-center justify-end gap-3">{footer}</div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return []

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ')
    )
  ).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  )
}
