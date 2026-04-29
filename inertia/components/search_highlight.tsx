interface SearchHighlightProps {
  className?: string
  query: string
  text: string
}

export function SearchHighlight({
  className = 'rounded bg-amber-200/80 px-0.5 text-inherit',
  query,
  text,
}: SearchHighlightProps) {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return text
  }

  const escapedQuery = escapeRegExp(trimmedQuery)
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'ig'))

  if (parts.length === 1) {
    return text
  }

  return parts.map((part, index) => {
    const isMatch = index % 2 === 1
    if (!isMatch) {
      return part
    }

    return (
      <mark className={className} key={`${part}-${index}`}>
        {part}
      </mark>
    )
  })
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
