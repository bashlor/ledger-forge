import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 350

interface SearchFormProps {
  ariaLabel: string
  className?: string
  onSubmit: (query: string) => void
  placeholder: string
  value: string
}

export function SearchForm({
  ariaLabel,
  className,
  onSubmit,
  placeholder,
  value,
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

  return (
    <div
      className={`flex w-full min-w-0 items-stretch sm:w-auto sm:min-w-[12rem] sm:max-w-md sm:flex-1 ${className ?? ''}`.trim()}
    >
      <input
        aria-label={ariaLabel}
        className="h-9 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-hidden transition-colors placeholder:text-on-surface-variant/75 focus:border-primary focus:ring-1 focus:ring-primary/20"
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
  )
}
