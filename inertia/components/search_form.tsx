import { useState } from 'react'

interface SearchFormProps {
  ariaLabel: string
  onSubmit: (query: string) => void
  placeholder: string
  value: string
}

export function SearchForm({ ariaLabel, onSubmit, placeholder, value }: SearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(value)

  return (
    <form
      className="flex w-full gap-2 sm:w-auto"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(searchQuery)
      }}
    >
      <input
        aria-label={ariaLabel}
        className="h-9 w-full rounded-lg border border-outline-variant/35 bg-surface px-3 text-sm text-on-surface outline-hidden transition-colors placeholder:text-on-surface-variant/80 focus:border-primary sm:w-64"
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={searchQuery}
      />
      <button
        className="rounded-lg border border-outline-variant/35 px-3 text-sm text-on-surface"
        type="submit"
      >
        Search
      </button>
    </form>
  )
}
