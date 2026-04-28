import type { RefObject } from 'react'

import { useEffect } from 'react'

export function useCloseOnOutsideAndEscape(
  open: boolean,
  setOpen: (value: boolean) => void,
  ref: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, ref, setOpen])
}
