import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 350

interface SearchFormProps {
  ariaLabel: string
  className?: string
  onSubmit: (query: string) => void
  placeholder: string
  value: string
  /** Premium styling: slate border, focus ring (no leading icon) */
  variant?: 'default' | 'premium'
}

export function SearchForm({
  ariaLabel,
  className,
  onSubmit,
  placeholder,
  value,
  variant = 'default',
}: SearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(value)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearchQuery(value)
  }, [value])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  function scheduleSubmit(next: string) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      onSubmit(next.trim())
    }, DEBOUNCE_MS)
  }

  const isPremium = variant === 'premium'

  const defaultInputClass =
    'h-9 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-hidden transition-colors placeholder:text-on-surface-variant/75 focus:border-primary focus:ring-1 focus:ring-primary/20'

  return (
    <div
      className={`flex w-full min-w-0 items-stretch sm:w-auto sm:min-w-[12rem] sm:max-w-md sm:flex-1 ${className ?? ''}`.trim()}
    >
      {isPremium ? (
        <div className="flex min-w-0 flex-1 rounded-xl border border-slate-200/95 bg-white shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03] transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <input
            aria-label={ariaLabel}
            className="h-10 w-full min-w-0 rounded-xl border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-hidden placeholder:text-slate-400 focus-visible:ring-0"
            onChange={(event) => {
              const next = event.target.value
              setSearchQuery(next)
              scheduleSubmit(next)
            }}
            placeholder={placeholder}
            type="search"
            value={searchQuery}
          />
        </div>
      ) : (
        <input
          aria-label={ariaLabel}
          className={defaultInputClass}
          onChange={(event) => {
            const next = event.target.value
            setSearchQuery(next)
            scheduleSubmit(next)
          }}
          placeholder={placeholder}
          type="search"
          value={searchQuery}
        />
      )}
    </div>
  )
}
