import type { ReactNode } from 'react'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { AppIcon } from './app_icon'

interface DrawerPanelProps {
  children: ReactNode
  description?: string
  footer: ReactNode
  icon: string
  /** Max width utility on the panel (default max-w-[560px]) */
  maxWidthClass?: string
  onClose: () => void
  open: boolean
  /** Extra classes on the sliding panel */
  panelClassName?: string
  title: string
}

export function DrawerPanel({
  children,
  description,
  footer,
  icon,
  maxWidthClass = 'max-w-[560px]',
  onClose,
  open,
  panelClassName,
  title,
}: DrawerPanelProps) {
  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (typeof document === 'undefined') {
    return null
  }

  const content = (
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[100] bg-on-surface/10 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        aria-label={title}
        aria-modal="true"
        className={`fixed inset-y-0 right-0 z-[110] flex w-full ${maxWidthClass} flex-col bg-surface-container-lowest/95 shadow-ambient backdrop-blur-xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        } ${panelClassName ?? ''}`.trim()}
        role="dialog"
      >
        <div className="shrink-0 border-b border-slate-200/60 bg-surface-container-low px-6 py-6 sm:px-8">
          <div className="mb-5 flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15">
              <AppIcon filled name={icon} size={24} />
            </div>
            <button
              aria-label="Close panel"
              className="rounded-full p-2 text-slate-500 transition-colors duration-150 hover:bg-slate-200/60 hover:text-slate-800"
              onClick={onClose}
              type="button"
            >
              <AppIcon name="close" size={20} />
            </button>
          </div>
          <h3 className="font-headline text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h3>
          {description ? (
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>

        <div className="shrink-0 border-t border-slate-200/80 bg-surface-container-low px-6 py-5 sm:px-8">
          {footer}
        </div>
      </div>
    </>
  )

  return createPortal(content, document.body)
}
