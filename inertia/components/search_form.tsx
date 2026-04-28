import { useState } from 'react'

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

  return (
    <form
      className={`flex w-full min-w-0 items-stretch gap-2 sm:w-auto sm:min-w-[12rem] sm:max-w-md sm:flex-1 ${className ?? ''}`.trim()}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(searchQuery)
      }}
    >
      <input
        aria-label={ariaLabel}
        className="h-9 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-hidden transition-colors placeholder:text-on-surface-variant/75 focus:border-primary focus:ring-1 focus:ring-primary/20"
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={searchQuery}
      />
      <button
        className="h-9 shrink-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
        type="submit"
      >
        Search
      </button>
    </form>
  )
}
